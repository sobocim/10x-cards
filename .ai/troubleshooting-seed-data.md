# Rozwiązanie problemu: "new row violates check constraint generation_sessions_input_text_check"

## 🐛 Problem

Podczas ładowania danych testowych z pliku `supabase/migrations/002_seed_data.sql` wystąpił błąd:

```
ERROR: 23514: new row for relation "generation_sessions" violates check constraint "generation_sessions_input_text_check"
DETAIL: Failing row contains (10000000-0000-0000-0000-000000000001, 0536cb41-25e3-4618-80ce-0be081b3e90d, PostgreSQL is a powerful, open source object-relational database..., 5, 4, 1, success, null, 2500, 450, anthropic/claude-3-5-sonnet, 2025-10-23 17:33:39.707793+00).
```

## 🔍 Przyczyna

Błąd jest spowodowany przez **constraint na długość `input_text`** w tabeli `generation_sessions`:

```sql
CONSTRAINT generation_sessions_input_text_check 
    CHECK (LENGTH(input_text) >= 1000 AND LENGTH(input_text) <= 10000)
```

### Dlaczego ten constraint istnieje?

Zgodnie z **US-003** w PRD (Product Requirements Document):

> Pole tekstowe oczekuje od 1000 do 10 000 znaków.

**Uzasadnienie biznesowe**:
- **Minimum 1000 znaków**: Zbyt krótki tekst (np. jedno zdanie) nie daje wystarczającego kontekstu do wygenerowania sensownych fiszek
- **Maximum 10000 znaków**: Limit zapobiega przeciążeniu API LLM i kontroluje koszty generowania

### Problem w danych testowych

Oryginalne teksty w `002_seed_data.sql` miały:
- **Tekst o PostgreSQL**: ~800 znaków ❌ (za mało)
- **Tekst o React**: ~700 znaków ❌ (za mało)

## ✅ Rozwiązanie

Zaktualizowano oba teksty w `002_seed_data.sql` na dłuższe wersje:

### Tekst 1: PostgreSQL (teraz ~1250 znaków ✅)

Dodano informacje o:
- PostgreSQL Global Development Group
- Zaawansowanych typach danych (geometric, network, JSON, XML)
- Typach indeksów (B-tree, GiST, GIN, BRIN)
- Optymalizacji zapytań
- ACID compliance i transaction support

### Tekst 2: React (teraz ~1450 znaków ✅)

Dodano informacje o:
- Komponentach class-based vs functional
- React Hooks (useState, useEffect, useContext, useCallback)
- Ekosystemie narzędzi (React Router, Redux)
- Bibliotekach UI
- React community

## 📊 Weryfikacja długości tekstów

Możesz sprawdzić długość tekstów w SQL:

```sql
-- Sprawdź długość tekstów w generation_sessions
SELECT 
    id,
    LENGTH(input_text) as text_length,
    CASE 
        WHEN LENGTH(input_text) >= 1000 AND LENGTH(input_text) <= 10000 
        THEN '✅ OK' 
        ELSE '❌ Invalid' 
    END as validation_status
FROM generation_sessions;
```

**Oczekiwany wynik**:
```
id                                   | text_length | validation_status
-------------------------------------|-------------|------------------
10000000-0000-0000-0000-000000000001 | 1250        | ✅ OK
10000000-0000-0000-0000-000000000002 | 1450        | ✅ OK
```

## 🔧 Jak teraz załadować dane testowe

### Krok 1: Usuń stare dane (jeśli próbowałeś wcześniej)

```sql
-- Usuń błędne dane (jeśli zostały częściowo wstawione)
DELETE FROM flashcards WHERE user_id = '0536cb41-25e3-4618-80ce-0be081b3e90d';
DELETE FROM generation_sessions WHERE user_id = '0536cb41-25e3-4618-80ce-0be081b3e90d';
DELETE FROM profiles WHERE user_id = '0536cb41-25e3-4618-80ce-0be081b3e90d';
```

### Krok 2: Upewnij się że profil istnieje

```sql
-- Sprawdź czy profil użytkownika istnieje
SELECT * FROM profiles WHERE user_id = '0536cb41-25e3-4618-80ce-0be081b3e90d';

-- Jeśli nie istnieje, utwórz go (patrz .ai/database-setup-guide.md Krok 6.2)
INSERT INTO public.profiles (user_id, created_at, updated_at)
VALUES ('0536cb41-25e3-4618-80ce-0be081b3e90d', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;
```

### Krok 3: Załaduj zaktualizowane dane testowe

1. Otwórz **SQL Editor** w Supabase Dashboard
2. Skopiuj całą zawartość **zaktualizowanego** pliku `supabase/migrations/002_seed_data.sql`
3. Wklej do SQL Editor
4. Kliknij **Run** lub `Ctrl+Enter`
5. Poczekaj na wykonanie (może zająć 2-3 sekundy)

### Krok 4: Weryfikacja

```sql
-- Sprawdź czy dane zostały załadowane
SELECT COUNT(*) as profile_count FROM profiles;
-- Powinno zwrócić: 1

SELECT COUNT(*) as session_count FROM generation_sessions;
-- Powinno zwrócić: 2

SELECT COUNT(*) as flashcard_count FROM flashcards;
-- Powinno zwrócić: 7

-- Sprawdź statystyki użytkownika
SELECT * FROM get_user_stats('0536cb41-25e3-4618-80ce-0be081b3e90d');

-- Sprawdź fiszki do powtórki
SELECT * FROM get_cards_due_for_review('0536cb41-25e3-4618-80ce-0be081b3e90d', 10);
```

## 🎯 Dodatkowe wskazówki dla własnych danych testowych

Jeśli chcesz stworzyć własne dane testowe, pamiętaj:

### 1. Długość input_text

```sql
-- ✅ Prawidłowy tekst (1000-10000 znaków)
INSERT INTO generation_sessions (input_text, ...) 
VALUES ('Very long text here... minimum 1000 characters...', ...);

-- ❌ Za krótki tekst (<1000 znaków)
INSERT INTO generation_sessions (input_text, ...) 
VALUES ('Short text', ...); -- BŁĄD!

-- ❌ Za długi tekst (>10000 znaków)
INSERT INTO generation_sessions (input_text, ...) 
VALUES ('Extremely long text... over 10000 chars...', ...); -- BŁĄD!
```

### 2. Sprawdź długość przed wstawieniem

```sql
-- Sprawdź długość tekstu w JavaScript/TypeScript
const text = "Your text here...";
console.log(`Length: ${text.length} chars`);

if (text.length < 1000) {
    console.error('Text too short! Need at least 1000 characters');
}
if (text.length > 10000) {
    console.error('Text too long! Maximum 10000 characters');
}
```

### 3. Generowanie testowych tekstów

Jeśli potrzebujesz wygenerować testowy tekst o odpowiedniej długości:

```javascript
// Generator lorem ipsum o określonej długości
function generateTestText(minLength = 1000) {
    const sentences = [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
        // ... więcej zdań
    ];
    
    let text = '';
    while (text.length < minLength) {
        text += sentences[Math.floor(Math.random() * sentences.length)] + ' ';
    }
    
    return text.slice(0, 10000); // Trim to max 10000
}

const testText = generateTestText(1000);
console.log(`Generated text: ${testText.length} chars`);
```

### 4. Przykład poprawnego INSERT

```sql
INSERT INTO generation_sessions (
    id,
    user_id,
    input_text,
    generated_count,
    accepted_count,
    rejected_count,
    status,
    created_at
) VALUES (
    gen_random_uuid(),
    'your-user-uuid',
    'Your text here with at least 1000 characters... Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Continue with more meaningful content to reach 1000+ characters...',
    5,
    4,
    1,
    'success',
    NOW()
);
```

## 🐛 Inne podobne błędy constraint

Jeśli napotkasz inne błędy constraint w `generation_sessions`:

### 1. accepted_count > generated_count

```
ERROR: violates check constraint "generation_sessions_accepted_count_check"
```

**Rozwiązanie**: `accepted_count` nie może być większe niż `generated_count`:

```sql
-- ❌ Błąd
INSERT INTO generation_sessions (...) 
VALUES (..., generated_count = 5, accepted_count = 10, ...); -- BŁĄD!

-- ✅ Poprawne
INSERT INTO generation_sessions (...) 
VALUES (..., generated_count = 10, accepted_count = 5, ...); -- OK
```

### 2. accepted_count + rejected_count > generated_count

```
ERROR: violates check constraint "generation_sessions_counts_check"
```

**Rozwiązanie**: Suma zaakceptowanych i odrzuconych nie może przekraczać liczby wygenerowanych:

```sql
-- ❌ Błąd
INSERT INTO generation_sessions (...) 
VALUES (..., generated_count = 5, accepted_count = 3, rejected_count = 4, ...); 
-- 3 + 4 = 7 > 5 BŁĄD!

-- ✅ Poprawne
INSERT INTO generation_sessions (...) 
VALUES (..., generated_count = 7, accepted_count = 3, rejected_count = 4, ...); 
-- 3 + 4 = 7 <= 7 OK
```

## 📚 Powiązane dokumenty

- `.ai/database-setup-guide.md` - Przewodnik konfiguracji (Krok 6 - ładowanie seed data)
- `.ai/database-schema.md` - Pełna dokumentacja schematu
- `.ai/prd.md` - Product Requirements Document (US-003)
- `supabase/migrations/002_seed_data.sql` - Zaktualizowane dane testowe

## ✅ Podsumowanie

**Problem**: Teksty w seed data były za krótkie (< 1000 znaków)

**Przyczyna**: Constraint `CHECK (LENGTH(input_text) >= 1000 AND LENGTH(input_text) <= 10000)`

**Rozwiązanie**: ✅ Zaktualizowano teksty do >1000 znaków

**Status**: Dane testowe są teraz gotowe do użycia! 🎉

Możesz teraz załadować `002_seed_data.sql` bez błędów.

