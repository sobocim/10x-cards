# Supabase - Szybki Start

Ten przewodnik przeprowadzi Cię przez proces uruchomienia lokalnej bazy danych Supabase dla projektu 10xCards.

## Wymagania

- Docker Desktop (zainstalowany i uruchomiony)
- Supabase CLI jest już zainstalowane w projekcie (dev dependency)

## Krok 1: Uruchom lokalną bazę danych

```bash
# Uruchom lokalne środowisko Supabase
npx supabase start
```

Ta komenda:
- Pobierze obrazy Docker dla Supabase (przy pierwszym uruchomieniu)
- Uruchomi lokalne środowisko Supabase (Postgres, Auth, Storage, etc.)
- Automatycznie uruchomi migracje z folderu `migrations/`

**Czas pierwszego uruchomienia:** ~2-5 minut (pobieranie obrazów)

## Krok 2: Zapisz dane dostępowe

Po uruchomieniu zobaczysz output podobny do:

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhb...
service_role key: eyJhb...
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local
```

**WAŻNE:** Skopiuj `anon key` - będzie potrzebny w pliku `.env`!

## Krok 3: Skonfiguruj zmienne środowiskowe

Utwórz plik `.env` w głównym folderze projektu:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<wklej-tutaj-anon-key-z-kroku-2>

# OpenRouter API Key (dla generowania fiszek AI)
OPENROUTER_API_KEY=your-openrouter-api-key
```

## Krok 4: Utwórz użytkownika testowego (dla seed data)

### Opcja A: Przez Supabase Studio (ZALECANA)

1. Otwórz Supabase Studio: http://127.0.0.1:54323
2. Przejdź do: **Authentication** → **Users**
3. Kliknij: **Add user** → **Create new user**
4. Wypełnij:
   - Email: `test@10xcards.dev`
   - Password: `TestPassword123!`
   - ✅ Auto Confirm User
5. Kliknij **Save**
6. Skopiuj UUID użytkownika (np. `a1b2c3d4-...`)

### Opcja B: Przez SQL Editor

1. Otwórz SQL Editor w Studio: http://127.0.0.1:54323
2. Uruchom query:

```sql
-- Pokaż aktualnych użytkowników
SELECT id, email FROM auth.users;
```

## Krok 5: Załaduj dane testowe (OPCJONALNE)

Jeśli chcesz mieć przykładowe dane testowe:

1. Otwórz plik: `supabase/migrations/20251026164500_002_seed_data.sql`
2. Zamień wszystkie wystąpienia:
   ```
   00000000-0000-0000-0000-000000000000
   ```
   na UUID użytkownika z Kroku 4
3. Załaduj seed data:

```bash
# Metoda 1: Przez SQL Editor w Studio
# Skopiuj zawartość 002_seed_data.sql i uruchom w Studio

# Metoda 2: Przez CLI
npx supabase db reset
```

**UWAGA:** `db reset` usuwa wszystkie dane i uruchamia migracje + seed data od nowa!

## Krok 6: Weryfikacja

Sprawdź czy wszystko działa:

```sql
-- W SQL Editor (http://127.0.0.1:54323)

-- Sprawdź tabele
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Sprawdź funkcje
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Sprawdź seed data (jeśli załadowane)
SELECT COUNT(*) FROM flashcards;
SELECT COUNT(*) FROM profiles;
```

## Przydatne komendy

```bash
# Zatrzymaj lokalne środowisko
npx supabase stop

# Uruchom ponownie
npx supabase start

# Zresetuj bazę (USUWA DANE!)
npx supabase db reset

# Pokaż status
npx supabase status

# Sprawdź logi
npx supabase db logs

# Otwórz Studio w przeglądarce
npx supabase studio
```

## Porty lokalne

- **API:** http://127.0.0.1:54321
- **Database:** postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Studio:** http://127.0.0.1:54323
- **Inbucket (emails):** http://127.0.0.1:54324
- **Astro dev server:** http://127.0.0.1:4321

## Następne kroki

Po uruchomieniu lokalnej bazy:

1. ✅ Uruchom aplikację: `npm run dev`
2. ✅ Otwórz: http://127.0.0.1:4321
3. ✅ Przetestuj rejestrację użytkownika
4. ✅ Sprawdź czy profile są tworzone automatycznie

## Troubleshooting

### Docker nie jest uruchomiony

```
Error: Docker is not running
```

**Rozwiązanie:** Uruchom Docker Desktop i spróbuj ponownie.

### Port 54321 jest zajęty

```
Error: Port 54321 is already in use
```

**Rozwiązanie:** Zatrzymaj inne instancje Supabase lub zmień port w `config.toml`.

### Migracje się nie uruchamiają

```bash
# Sprawdź status migracji
npx supabase migration list

# Wymuś reset (USUWA DANE!)
npx supabase db reset --debug
```

### Potrzebujesz więcej pomocy?

Sprawdź:
- `supabase/README.md` - Pełna dokumentacja
- https://supabase.com/docs/guides/cli/local-development
- https://supabase.com/docs/guides/database/migrations

---

**Sukces!** 🎉 Twoje lokalne środowisko Supabase jest gotowe!

