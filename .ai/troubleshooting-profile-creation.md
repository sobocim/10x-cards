# Rozwiązanie problemu: "Failed to create user: Database error creating new user"

## 🐛 Problem

Podczas próby utworzenia użytkownika przez Supabase Dashboard (Authentication → Users → Add user) pojawia się błąd:

```
Failed to create user: Database error creating new user
```

## 🔍 Przyczyna

Błąd jest spowodowany przez próbę utworzenia triggera na tabeli `auth.users`:

```sql
-- To NIE DZIAŁA w Supabase:
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users  -- ❌ Brak uprawnień
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

### Dlaczego to nie działa?

1. **`auth.users` jest zarządzana przez Supabase Auth** - nie mamy bezpośredniego dostępu
2. **Schema `auth` jest chroniony** - nie możemy tworzyć triggerów przez zwykłe SQL
3. **Supabase Auth działa na innej warstwie** - poza PostgreSQL triggers

## ✅ Rozwiązania

### **Rozwiązanie 1: Ręczne tworzenie profili** (Najprostsze dla MVP)

#### Krok 1: Utwórz użytkownika przez Dashboard

1. Przejdź do **Authentication** → **Users**
2. Kliknij **Add user** → **Create new user**
3. Wypełnij:
   - Email: `test@example.com`
   - Password: Ustaw testowe hasło
   - **Auto Confirm User**: ✅ Zaznacz (dla środowiska testowego)
4. Kliknij **Create user**
5. **Skopiuj UUID użytkownika** z listy

#### Krok 2: Ręcznie utwórz profil w SQL Editor

1. Przejdź do **SQL Editor**
2. Uruchom następujące query (zamień UUID):

```sql
-- Zamień UUID na skopiowane z kroku 1
INSERT INTO public.profiles (user_id, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',  -- ← ZMIEŃ NA RZECZYWISTY UUID
    NOW(),
    NOW()
);

-- Sprawdź czy profil został utworzony
SELECT * FROM profiles WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

✅ Teraz użytkownik ma profil i może korzystać z aplikacji!

---

### **Rozwiązanie 2: Tworzenie profilu w kodzie aplikacji** (Rekomendowane dla produkcji)

W kodzie aplikacji, po rejestracji użytkownika, automatycznie twórz profil:

#### Frontend (signup flow):

```typescript
// src/pages/api/auth/signup.ts
import type { APIRoute } from 'astro';
import { supabase } from '@/db/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { email, password } = await request.json();

  // 1. Utwórz użytkownika w Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return new Response(
      JSON.stringify({ error: authError?.message || 'Signup failed' }),
      { status: 400 }
    );
  }

  // 2. Automatycznie utwórz profil
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authData.user.id,
    });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    // Opcjonalnie: usuń użytkownika jeśli profil się nie utworzył
    // await supabase.auth.admin.deleteUser(authData.user.id);
    return new Response(
      JSON.stringify({ error: 'Failed to create user profile' }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ 
      message: 'User created successfully',
      user: authData.user 
    }),
    { status: 200 }
  );
};
```

#### Middleware Astro (automatyczne tworzenie profilu):

```typescript
// src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';
import { supabase } from '@/db/supabase';

export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  // Pobierz sesję użytkownika
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Sprawdź czy użytkownik ma profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    // Jeśli nie ma profilu, utwórz go
    if (!profile) {
      await supabase.from('profiles').insert({
        user_id: session.user.id,
      });
    }
  }

  return next();
});
```

**Zalety**:
- ✅ Automatyczne tworzenie profili przy rejestracji
- ✅ Nie wymaga ręcznej interwencji
- ✅ Działa w produkcji i dev

---

### **Rozwiązanie 3: Supabase Database Webhooks** (Najbardziej zaawansowane)

Supabase pozwala na tworzenie webhooków reagujących na eventy w bazie danych.

#### Krok 1: Utwórz endpoint API do tworzenia profili

```typescript
// src/pages/api/webhooks/create-profile.ts
import type { APIRoute } from 'astro';
import { supabase } from '@/db/supabase';

export const POST: APIRoute = async ({ request }) => {
  // Weryfikacja webhook secret (dla bezpieczeństwa)
  const secret = request.headers.get('x-supabase-signature');
  if (secret !== import.meta.env.SUPABASE_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const userId = payload.record.id; // UUID nowego użytkownika

  // Utwórz profil
  const { error } = await supabase.from('profiles').insert({
    user_id: userId,
  });

  if (error) {
    console.error('Error creating profile:', error);
    return new Response('Error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
};
```

#### Krok 2: Skonfiguruj webhook w Supabase Dashboard

1. Przejdź do **Database** → **Webhooks**
2. Kliknij **Create a new hook**
3. Skonfiguruj:
   - **Name**: `create-profile-on-signup`
   - **Table**: `auth.users`
   - **Events**: ✅ `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://your-app.com/api/webhooks/create-profile`
   - **Headers**: `x-supabase-signature: your-secret-key`
4. Kliknij **Create webhook**

**Zalety**:
- ✅ Automatyczne, bez logiki w aplikacji
- ✅ Działa dla wszystkich metod rejestracji (email, OAuth, etc.)
- ✅ Nie wymaga zmian w kodzie frontendu

**Wady**:
- ❌ Wymaga publicznego endpointu API
- ❌ Bardziej skomplikowane w konfiguracji
- ❌ Trzeba zabezpieczyć webhook secret

---

## 🎯 Rekomendacja dla MVP

### Dla środowiska **DEV/STAGING**:
✅ **Rozwiązanie 1** - Ręczne tworzenie profili  
Najszybsze, wystarczy do testowania

### Dla środowiska **PRODUKCJA**:
✅ **Rozwiązanie 2** - Tworzenie w kodzie aplikacji  
Najbardziej niezawodne i proste w utrzymaniu

### Dla przyszłości (po MVP):
💡 **Rozwiązanie 3** - Database Webhooks  
Gdy aplikacja się rozwinie i potrzebujesz więcej automatyzacji

---

## 📝 Przykład: Kompletny flow rejestracji z Rozwiązaniem 2

### 1. Komponent rejestracji (React):

```tsx
// src/components/auth/SignUpForm.tsx
import { useState } from 'react';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Sukces! Przekieruj do dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        minLength={6}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

### 2. API endpoint:

(Zobacz kod z Rozwiązania 2 powyżej)

### 3. Test flow:

```typescript
// Test w przeglądarce
const testSignup = async () => {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'newuser@test.com',
      password: 'securePassword123',
    }),
  });

  const data = await response.json();
  console.log('Signup result:', data);

  // Sprawdź czy profil został utworzony
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .single();

  console.log('Profile created:', profile);
};
```

---

## 🔧 Debugging

### Problem: Profil się nie tworzy mimo Rozwiązania 2

```sql
-- Sprawdź RLS policies na profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Tymczasowo wyłącz RLS (tylko dla debugowania!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Spróbuj utworzyć profil ręcznie
INSERT INTO profiles (user_id) VALUES ('test-uuid');

-- Jeśli działa, problem jest w RLS. Włącz z powrotem:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Problem: "new row violates row-level security policy"

RLS blokuje INSERT do `profiles`. Sprawdź policy:

```sql
-- Powinna być policy dla INSERT:
CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (user_id = auth.uid());
```

**UWAGA**: Ta policy działa tylko gdy użytkownik jest zalogowany. Przy tworzeniu profilu po rejestracji, użytkownik może nie mieć jeszcze sesji.

**Rozwiązanie**: Użyj Service Role Key w backend:

```typescript
// Backend z Service Role (omija RLS)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key
  {
    auth: {
      persistSession: false,
    },
  }
);

// Teraz może tworzyć profile bez RLS
await supabaseAdmin.from('profiles').insert({ user_id: userId });
```

---

## 📚 Podsumowanie

### Co nie działa:
❌ Trigger bezpośrednio na `auth.users`

### Co działa:
✅ Ręczne tworzenie profili (dev/testing)  
✅ Tworzenie w kodzie aplikacji (produkcja)  
✅ Database Webhooks (zaawansowane)

### Zalecenie dla 10x-cards MVP:
**Użyj Rozwiązania 2** - twórz profile w API endpoint po rejestracji. To najprostsze, najbardziej niezawodne rozwiązanie dla MVP.

---

## 🔗 Dodatkowe zasoby

- [Supabase Auth: Server-Side Auth](https://supabase.com/docs/guides/auth/server-side)
- [Supabase: Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [PostgreSQL: Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html)

