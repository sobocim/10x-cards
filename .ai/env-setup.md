# Konfiguracja zmiennych środowiskowych

## 📝 Wymagane zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu projektu z następującymi zmiennymi:

```bash
# ============================================================================
# SUPABASE CONFIGURATION
# ============================================================================

# Public URL (safe to expose to client)
# Get from: Supabase Dashboard → Settings → API → Project URL
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Anonymous Key (safe to expose to client)
# Get from: Supabase Dashboard → Settings → API → Project API keys → anon public
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (NEVER expose to client! Server-only!)
# Required for: admin operations, bypassing RLS, creating profiles on signup
# Get from: Supabase Dashboard → Settings → API → Project API keys → service_role
# ⚠️ WARNING: This key bypasses Row Level Security. Keep it secret!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# OPENROUTER.AI CONFIGURATION
# ============================================================================

# OpenRouter API Key
# Get from: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-...

# Optional: Default model to use for flashcard generation
# See available models at: https://openrouter.ai/models
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3-5-sonnet

# ============================================================================
# APPLICATION SETTINGS
# ============================================================================

# Optional: Rate limiting for AI generation (sessions per day per user)
MAX_DAILY_GENERATIONS=10
```

## 🔑 Gdzie znaleźć klucze Supabase?

### 1. Project URL
- Otwórz [Supabase Dashboard](https://app.supabase.com)
- Wybierz swój projekt
- Przejdź do **Settings** → **API**
- Skopiuj wartość z **Project URL**

### 2. Anon Key (Public Key)
- W tym samym miejscu (**Settings** → **API**)
- Znajdź sekcję **Project API keys**
- Skopiuj klucz **anon** / **public**
- ✅ Ten klucz jest bezpieczny do użycia w frontendzie

### 3. Service Role Key (Secret Key)
- W tym samym miejscu (**Settings** → **API**)
- Znajdź sekcję **Project API keys**
- Kliknij **Reveal** obok **service_role**
- Skopiuj klucz
- ⚠️ **UWAGA**: Ten klucz jest SUPER TAJNY! Nigdy nie commituj go do git!

## 🔒 Bezpieczeństwo

### ✅ Co MOŻNA commitować do git:
- `PUBLIC_SUPABASE_URL` - publiczny URL
- `PUBLIC_SUPABASE_ANON_KEY` - publiczny klucz (ma ograniczenia RLS)
- `.env.example` - przykładowy plik bez rzeczywistych wartości

### ❌ Czego NIGDY nie commitować:
- `SUPABASE_SERVICE_ROLE_KEY` - pełny dostęp do bazy!
- `OPENROUTER_API_KEY` - dostęp do płatnego API
- `.env` - plik z rzeczywistymi wartościami

### 🛡️ Dlaczego Service Role Key jest niebezpieczny?

Service Role Key **omija wszystkie Row Level Security (RLS) policies**:

```typescript
// Z anon key (bezpieczne):
const { data } = await supabase.from('flashcards').select('*');
// Zwróci TYLKO fiszki zalogowanego użytkownika (RLS działa)

// Z service role key (niebezpieczne!):
const { data } = await supabaseAdmin.from('flashcards').select('*');
// Zwróci WSZYSTKIE fiszki WSZYSTKICH użytkowników (RLS pominięty!)
```

**Dlatego**:
- ✅ Używaj Service Role Key TYLKO w backend (API endpoints)
- ✅ Nigdy nie wysyłaj Service Role Key do frontendu
- ✅ Używaj go tylko do operacji admin (tworzenie profili, moderacja, etc.)

## 🔄 Rotacja kluczy

Jeśli przypadkowo wycieknie Service Role Key:

1. Przejdź do Supabase Dashboard → Settings → API
2. Kliknij **Reset service_role key**
3. Zaktualizuj `.env` z nowym kluczem
4. Restart aplikacji

## 🧪 Environment dla różnych środowisk

### Development (.env.development)
```bash
PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=dev-service-role-key
```

### Production (.env.production)
```bash
PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key
```

### Staging (.env.staging)
```bash
PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-role-key
```

## 📦 Używanie w kodzie

### Astro (import.meta.env)

```typescript
// Dostęp do public variables (frontend i backend)
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Dostęp do secret variables (TYLKO backend!)
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
```

### Walidacja przy starcie aplikacji

```typescript
// src/lib/env.ts
export function validateEnv() {
  const required = [
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
  ];

  const missing = required.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    );
  }
}

// Wywołaj przy starcie aplikacji
validateEnv();
```

## 🐛 Troubleshooting

### Problem: "Missing Supabase environment variables"

**Przyczyna**: Brak pliku `.env` lub błędne nazwy zmiennych

**Rozwiązanie**:
1. Sprawdź czy plik `.env` istnieje w głównym katalogu
2. Sprawdź czy zmienne zaczynają się od `PUBLIC_` (wymagane przez Astro dla client-side)
3. Restart dev servera: `npm run dev`

### Problem: "Invalid API key"

**Przyczyna**: Nieprawidłowy lub wygasły klucz

**Rozwiązanie**:
1. Skopiuj klucze ponownie z Supabase Dashboard
2. Upewnij się że nie ma spacji na początku/końcu
3. Sprawdź czy to odpowiedni projekt (dev vs prod)

### Problem: Service Role Key nie działa

**Przyczyna**: Próba użycia w frontendzie

**Rozwiązanie**:
Service Role Key działa TYLKO w backend (API routes, server-side):

```typescript
// ❌ NIE DZIAŁA (frontend)
// src/components/MyComponent.tsx
const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY; // undefined!

// ✅ DZIAŁA (backend)
// src/pages/api/auth/signup.ts
export const POST: APIRoute = async () => {
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY; // OK!
};
```

## 📚 Dodatkowe zasoby

- [Astro: Environment Variables](https://docs.astro.build/en/guides/environment-variables/)
- [Supabase: API Keys](https://supabase.com/docs/guides/api/api-keys)
- [OpenRouter: API Keys](https://openrouter.ai/docs#api-keys)

