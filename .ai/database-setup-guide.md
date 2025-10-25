# Przewodnik konfiguracji bazy danych - 10x-cards

## 🎯 Cel

Ten dokument zawiera krok po kroku instrukcje konfiguracji bazy danych PostgreSQL w Supabase dla projektu 10x-cards MVP.

## 📋 Wymagania wstępne

- Konto w [Supabase](https://supabase.com)
- Node.js 18+ i npm
- (Opcjonalnie) Supabase CLI

## 🚀 Krok 1: Utwórz projekt w Supabase

1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Kliknij "New Project"
3. Wypełnij dane projektu:
   - **Name**: 10x-cards (lub dowolna nazwa)
   - **Database Password**: Zapisz bezpiecznie! (będzie potrzebne)
   - **Region**: Wybierz najbliższy region (np. Central EU - Frankfurt)
   - **Pricing Plan**: Free (dla MVP wystarczy)
4. Kliknij "Create new project"
5. Poczekaj ~2 minuty aż projekt się utworzy

## 🔑 Krok 2: Skopiuj klucze API

1. W Supabase Dashboard przejdź do **Settings** → **API**
2. Znajdź i skopiuj:
   - **Project URL** (np. `https://abcdefgh.supabase.co`)
   - **anon public** key (długi string zaczynający się od `eyJ...`)
3. Zapisz te wartości - będą potrzebne w `.env`

## 📁 Krok 3: Skonfiguruj zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu projektu:

```bash
# .env
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here

OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3-5-sonnet
```

**Ważne**: Zamień wartości na rzeczywiste klucze z twojego projektu!

## 🗄️ Krok 4: Uruchom migracje bazy danych

### Opcja A: Przez Supabase Dashboard (prostsze)

1. W Supabase Dashboard przejdź do **SQL Editor**
2. Kliknij **New query**
3. Skopiuj całą zawartość pliku `supabase/migrations/001_init_schema.sql`
4. Wklej do edytora SQL
5. Kliknij **Run** (lub Ctrl+Enter)
6. Poczekaj ~10-20 sekund na wykonanie
7. Sprawdź czy nie ma błędów w konsoli

### Opcja B: Przez Supabase CLI (zalecane dla zaawansowanych)

```bash
# Zainstaluj Supabase CLI globalnie
npm install -g supabase

# Zaloguj się do Supabase
supabase login

# Link do projektu (znajdź project-ref w URL dashboardu)
supabase link --project-ref your-project-ref

# Uruchom migracje
supabase db push
```

## ✅ Krok 5: Weryfikacja schematu

Po uruchomieniu migracji, sprawdź w SQL Editor:

```sql
-- Sprawdź czy tabele zostały utworzone (powinny być 3)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Sprawdź czy RLS jest włączony (wszystkie TRUE)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Sprawdź funkcje (powinno być 7)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Sprawdź ENUMs (powinny być 2)
SELECT typname 
FROM pg_type 
WHERE typtype = 'e'
ORDER BY typname;
```

Oczekiwane wyniki:
- **Tabele**: `flashcards`, `generation_sessions`, `profiles`
- **RLS**: Wszystkie `TRUE`
- **Funkcje**: 7 funkcji (update_card_review, get_cards_due_for_review, get_user_stats, itd.)
- **ENUMs**: `flashcard_source`, `generation_status`

## 🧪 Krok 6: (Opcjonalnie) Załaduj dane testowe

**TYLKO dla środowiska DEV/STAGING!**

### Krok 6.1: Utwórz użytkownika testowego

1. Przejdź do **Authentication** → **Users**
2. Kliknij **Add user** → **Create new user**
3. Wypełnij:
   - **Email**: `test@example.com`
   - **Password**: Ustaw testowe hasło (min. 6 znaków)
   - **Auto Confirm User**: ✅ Zaznacz (ważne dla testów!)
4. Kliknij **Create user**
5. **Skopiuj UUID użytkownika** z listy (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Krok 6.2: Ręcznie utwórz profil użytkownika

**WAŻNE**: Ze względu na ograniczenia Supabase, profil nie tworzy się automatycznie. Musisz go utworzyć ręcznie:

1. Przejdź do **SQL Editor**
2. Uruchom następujące query (zamień UUID na skopiowany):

```sql
-- Zamień UUID na skopiowane w kroku 6.1
INSERT INTO public.profiles (user_id, created_at, updated_at)
VALUES (
    'WKLEJ-TUTAJ-UUID-UŻYTKOWNIKA',  -- ← ZMIEŃ!
    NOW(),
    NOW()
);

-- Sprawdź czy profil został utworzony
SELECT * FROM profiles WHERE user_id = 'WKLEJ-TUTAJ-UUID-UŻYTKOWNIKA';
```

**Wyjaśnienie**: Supabase nie pozwala na tworzenie triggerów na tabeli `auth.users`, więc profil musi być utworzony ręcznie lub w kodzie aplikacji. Zobacz `.ai/troubleshooting-profile-creation.md` dla szczegółów.

### Krok 6.3: Załaduj przykładowe dane

1. Zaktualizuj `supabase/migrations/002_seed_data.sql`:
   - Znajdź wszystkie wystąpienia `00000000-0000-0000-0000-000000000001`
   - Zamień na UUID skopiowany w kroku 6.1

2. Uruchom seed data w SQL Editor:
   - Skopiuj całą zawartość `002_seed_data.sql`
   - Wklej do SQL Editor
   - Kliknij **Run**

3. Weryfikuj dane testowe:
```sql
SELECT * FROM profiles;
SELECT * FROM flashcards;
SELECT * FROM generation_sessions;
```

**Oczekiwane wyniki**:
- 1 profil użytkownika testowego
- 7 fiszek (4 AI-generated, 3 manual)
- 2 sesje generowania

## 🧾 Krok 7: Test funkcji bazy danych

Przetestuj czy funkcje działają poprawnie:

```sql
-- Test 1: Sprawdź statystyki użytkownika testowego
SELECT get_user_stats('your-test-user-uuid');

-- Test 2: Pobierz fiszki do powtórki
SELECT * FROM get_cards_due_for_review('your-test-user-uuid', 10);

-- Test 3: Aktualizuj fiszkę po powtórce
SELECT * FROM update_card_review('flashcard-uuid', 4);
```

Zamień UUID na rzeczywiste wartości z twojej bazy.

## 🔧 Krok 8: Konfiguracja w kodzie aplikacji

Zainstaluj Supabase client:

```bash
npm install @supabase/supabase-js
```

Plik `src/db/supabase.ts` jest już gotowy i skonfigurowany. Używaj go tak:

```typescript
// Przykład użycia w API route
import { supabase, flashcardsTable, getUserStats } from '@/db/supabase';

// Pobierz fiszki użytkownika
const { data: flashcards, error } = await flashcardsTable()
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Pobierz statystyki
const { data: stats, error } = await getUserStats(userId);
```

## 🛡️ Krok 9: Weryfikacja Row Level Security

Sprawdź czy RLS działa poprawnie:

1. Zaloguj się jako użytkownik testowy w aplikacji
2. Spróbuj pobrać fiszki:
```typescript
const { data, error } = await supabase
  .from('flashcards')
  .select('*');

// Powinieneś zobaczyć TYLKO swoje fiszki
console.log('My flashcards:', data);
```

3. Spróbuj pobrać cudze fiszki (powinno zwrócić puste):
```typescript
const { data, error } = await supabase
  .from('flashcards')
  .select('*')
  .eq('user_id', 'some-other-user-uuid');

// Powinno zwrócić [] (puste) przez RLS
console.log('Other user flashcards:', data); // []
```

## 🐛 Troubleshooting

### Problem: "Missing Supabase environment variables"

**Przyczyna**: Brak zmiennych środowiskowych w `.env`

**Rozwiązanie**:
1. Sprawdź czy plik `.env` istnieje w głównym katalogu
2. Sprawdź czy zmienne zaczynają się od `PUBLIC_` (wymagane przez Astro)
3. Restart dev servera: `npm run dev`

### Problem: "No rows returned" mimo że dane istnieją

**Przyczyna**: RLS blokuje dostęp

**Rozwiązanie**:
1. Sprawdź czy użytkownik jest zalogowany: `const user = await supabase.auth.getUser()`
2. Sprawdź czy `auth.uid()` zwraca poprawny UUID w SQL:
```sql
SELECT auth.uid(); -- Powinno zwrócić UUID, nie NULL
```
3. Jeśli NULL, zaloguj się ponownie

### Problem: "Failed to create user: Database error creating new user"

**Przyczyna**: Trigger `on_auth_user_created` próbował się podpiąć pod `auth.users`, ale Supabase tego nie pozwala w zwykłych migracjach SQL.

**Status**: ✅ Trigger został wyłączony w najnowszej wersji migracji (zakomentowany)

**Rozwiązanie dla testów (DEV/STAGING)**:
1. Utwórz użytkownika przez Dashboard (Authentication → Users → Add user)
2. Ręcznie utwórz profil przez SQL Editor:
```sql
INSERT INTO public.profiles (user_id, created_at, updated_at)
VALUES ('UUID-UŻYTKOWNIKA', NOW(), NOW());
```
Zobacz szczegółowe instrukcje w **Krok 6.2** powyżej.

**Rozwiązanie dla produkcji**:
Twórz profil automatycznie w kodzie aplikacji po rejestracji:
```typescript
// API endpoint: src/pages/api/auth/signup.ts
const { data: authData } = await supabase.auth.signUp({
  email, password
});

if (authData.user) {
  // Automatycznie utwórz profil
  await supabase.from('profiles').insert({
    user_id: authData.user.id
  });
}
```

**Szczegółowe rozwiązania i przykłady kodu**: Zobacz `.ai/troubleshooting-profile-creation.md`

### Problem: Wolne zapytania

**Przyczyna**: Brak indeksów lub dużo danych

**Rozwiązanie**:
1. Sprawdź czy indeksy zostały utworzone (powinno być ~7 indeksów):
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```
2. Użyj `EXPLAIN ANALYZE` do debugowania:
```sql
EXPLAIN ANALYZE 
SELECT * FROM flashcards 
WHERE user_id = 'some-uuid' 
  AND next_review_date <= NOW();
-- Powinien używać idx_flashcards_next_review_date
```

### Problem: "functions in index predicate must be marked IMMUTABLE"

**Przyczyna**: Ten błąd występował w starszej wersji migracji z partial index używającym `NOW()`

**Rozwiązanie**: Upewnij się, że używasz najnowszej wersji `001_init_schema.sql`. Partial index został usunięty i zastąpiony zwykłym composite index, który jest wystarczający.

### Problem: "new row violates check constraint generation_sessions_input_text_check"

**Przyczyna**: Teksty w seed data są za krótkie (< 1000 znaków). Constraint wymaga 1000-10000 znaków zgodnie z US-003.

**Rozwiązanie**: 
1. Upewnij się, że używasz **najnowszej wersji** `002_seed_data.sql` z zaktualizowanymi tekstami
2. Teksty zostały wydłużone do >1000 znaków
3. Zobacz szczegóły w `.ai/troubleshooting-seed-data.md`

## 📚 Dodatkowe zasoby

- **Dokumentacja schematu**: `.ai/database-schema.md`
- **Migracje**: `supabase/migrations/`
- **Typy TypeScript**: `src/db/types.ts`
- **Supabase Client**: `src/db/supabase.ts`
- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

## ✅ Checklist konfiguracji

Użyj tej checklisty aby upewnić się, że wszystko zostało skonfigurowane:

- [ ] Utworzony projekt w Supabase
- [ ] Skopiowane klucze API (URL + anon key)
- [ ] Utworzony plik `.env` z kluczami
- [ ] Uruchomiona migracja `001_init_schema.sql`
- [ ] Zweryfikowany schemat (3 tabele, 7 funkcji, 2 ENUMs)
- [ ] Sprawdzony RLS (wszystkie tabele TRUE)
- [ ] (Opcjonalnie) Załadowane dane testowe
- [ ] Przetestowane funkcje bazy danych
- [ ] Zainstalowany `@supabase/supabase-js`
- [ ] Zweryfikowane połączenie z aplikacji
- [ ] Przetestowane RLS z poziomu aplikacji

## 🎉 Gotowe!

Twoja baza danych jest teraz gotowa do użycia w aplikacji 10x-cards!

Następne kroki:
1. Implementacja autentykacji (rejestracja/logowanie)
2. Implementacja widoku generowania fiszek
3. Implementacja widoku "Moje fiszki"
4. Implementacja sesji nauki

Powodzenia! 🚀

