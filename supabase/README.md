# Supabase Database Migrations

Ten katalog zawiera migracje bazy danych dla projektu 10x-cards.

## Struktura

```
supabase/
├── migrations/
│   ├── 001_init_schema.sql     # Główny schemat bazy danych (produkcja)
│   └── 002_seed_data.sql       # Dane testowe (tylko dev/staging)
└── README.md                   # Ten plik
```

## Migracje

### 001_init_schema.sql

Główna migracja zawierająca kompletny schemat bazy danych:

- **ENUMs**: `flashcard_source`, `generation_status`
- **Tabele**: `profiles`, `flashcards`, `generation_sessions`
- **Foreign Keys**: Relacje między tabelami z CASCADE
- **Funkcje**: 7 funkcji (SM-2, statystyki, triggery)
- **Triggers**: Auto-update timestamps, statystyki
  - ⚠️ Trigger auto-create profile został wyłączony (Supabase nie pozwala na triggery na auth.users)
- **Indeksy**: 7 indeksów optymalizujących wydajność zapytań
- **RLS Policies**: Bezpieczeństwo na poziomie wierszy
- **Komentarze**: Dokumentacja w bazie danych

**Status**: ✅ Gotowe do produkcji

### 002_seed_data.sql

Opcjonalne dane testowe dla środowisk dev/staging:

- Przykładowy profil użytkownika
- 2 sesje generowania (success + failed)
- 7 przykładowych fiszek (4 AI-generated, 3 manual)
- Query weryfikacyjne z automatyczną weryfikacją

**UWAGA**: ⚠️ **NIE URUCHAMIAĆ NA PRODUKCJI!**

Przed uruchomieniem:
1. **Utwórz użytkownika testowego** przez Supabase Studio (http://127.0.0.1:54323)
   - Email: `test@10xcards.dev`
   - Password: `TestPassword123!`
2. Skopiuj wygenerowany UUID użytkownika
3. Zamień wszystkie wystąpienia `00000000-0000-0000-0000-000000000000` w pliku na rzeczywisty UUID
4. Plik zawiera automatyczną weryfikację - jeśli użytkownik nie istnieje, wyświetli się czytelny błąd

## Jak uruchomić migracje

### Opcja 1: Supabase CLI (zalecane)

```bash
# Zainstaluj Supabase CLI
npm install -g supabase

# Zaloguj się do Supabase
supabase login

# Link do projektu
supabase link --project-ref your-project-ref

# Uruchom migracje
supabase db push
```

### Opcja 2: Supabase Dashboard

1. Otwórz Supabase Dashboard
2. Przejdź do SQL Editor
3. Skopiuj zawartość `001_init_schema.sql`
4. Wklej do edytora
5. Kliknij "Run"

### Opcja 3: psql (lokalnie)

```bash
# Lokalnie (Supabase Local Development)
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/001_init_schema.sql

# Seed data (tylko dev/staging)
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/002_seed_data.sql
```

## Dokumentacja

Pełna dokumentacja schematu bazy danych znajduje się w `.ai/database-schema.md`:

- Diagram ERD (Mermaid)
- Szczegółowy opis wszystkich tabel
- Typy ENUM
- Funkcje i ich implementacja
- RLS Policies
- Algorytm SM-2
- Metryki sukcesu
- Strategie indeksowania

## Weryfikacja

Po uruchomieniu migracji, zweryfikuj poprawność:

```sql
-- Sprawdź czy tabele zostały utworzone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Sprawdź czy RLS jest włączony
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Sprawdź funkcje
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Test funkcji get_user_stats
SELECT get_user_stats(auth.uid());
```

## Rollback

Jeśli potrzebujesz cofnąć migrację:

```sql
-- UWAGA: To usunie WSZYSTKIE dane!
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS generation_sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS flashcard_source CASCADE;
DROP TYPE IF EXISTS generation_status CASCADE;
DROP FUNCTION IF EXISTS update_card_review CASCADE;
DROP FUNCTION IF EXISTS get_cards_due_for_review CASCADE;
DROP FUNCTION IF EXISTS get_user_stats CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_profile_stats CASCADE;
DROP FUNCTION IF EXISTS update_profile_stats_on_source_change CASCADE;
```

## Troubleshooting

### Problem: "insert or update on table profiles violates foreign key constraint"

**Przyczyna**: Próba wstawienia profilu dla użytkownika, który nie istnieje w `auth.users`.

**Rozwiązanie**: 
1. Najpierw utwórz użytkownika testowego przez Supabase Studio:
   - Otwórz http://127.0.0.1:54323
   - Przejdź do Authentication > Users > Add user
   - Email: `test@10xcards.dev`, Password: `TestPassword123!`
2. Skopiuj UUID użytkownika
3. Zamień wszystkie `00000000-0000-0000-0000-000000000000` w `002_seed_data.sql` na rzeczywisty UUID
4. Uruchom ponownie seed data

**Dla produkcji**: Profile są tworzone automatycznie w kodzie aplikacji po rejestracji użytkownika.

### Problem: RLS blokuje wszystkie zapytania

**Rozwiązanie**: Upewnij się, że użytkownik jest zalogowany i `auth.uid()` zwraca poprawny UUID:

```sql
SELECT auth.uid(); -- Powinno zwrócić UUID, nie NULL
```

### Problem: Seed data się nie wstawia lub wstawia się częściowo

**Rozwiązanie**: Plik `002_seed_data.sql` zawiera automatyczną weryfikację. Sprawdź output w konsoli - jeśli użytkownik nie istnieje, zobaczysz czytelny komunikat błędu z instrukcjami.

**Sprawdź czy użytkownik istnieje:**
```sql
SELECT id, email FROM auth.users WHERE email = 'test@10xcards.dev';
```

## Następne kroki

Po uruchomieniu migracji:

1. ✅ Zweryfikuj schemat bazy danych
2. ✅ Przetestuj funkcje (get_user_stats, update_card_review)
3. ✅ Sprawdź RLS policies
4. ✅ (Opcjonalnie) Załaduj seed data w dev
5. ✅ Skonfiguruj Supabase Client w aplikacji
6. ✅ Utwórz typy TypeScript dla tabel

## Kontakt

W razie pytań lub problemów, sprawdź dokumentację:
- `.ai/database-schema.md` - Pełna dokumentacja schematu
- `.ai/prd.md` - Wymagania produktu
- `.ai/tech-stack.md` - Stack technologiczny

