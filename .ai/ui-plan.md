# Architektura UI dla 10xCards

**Wersja:** 1.0  
**Data:** 2025-10-26  
**Status:** Zatwierdzony do implementacji

---

## 1. Przegląd struktury UI

### 1.1 Koncepcja ogólna

10xCards to aplikacja webowa umożliwiająca użytkownikom tworzenie i zarządzanie fiszkami edukacyjnymi z wykorzystaniem sztucznej inteligencji. Architektura UI została zaprojektowana z myślą o prostocie obsługi, szybkim dostępie do kluczowych funkcji i bezproblemowym przepływie między generowaniem fiszek AI a nauką metodą spaced repetition.

### 1.2 Główne założenia architektoniczne

**Tech Stack:**
- **Framework:** Astro 5 (SSG/SSR z partial hydration)
- **Interaktywność:** React 19 (komponenty interaktywne)
- **Styling:** Tailwind CSS 4
- **Komponenty UI:** shadcn/ui + Radix UI
- **Zarządzanie stanem:** TanStack Query (React Query)
- **Formularze:** React Hook Form + Zod
- **Ikony:** lucide-react
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **AI:** OpenRouter.ai API

**Podejście architektoniczne:**
- **Partial Hydration:** Komponenty statyczne w Astro, interaktywne w React
- **Mobile-First:** Responsywny design z priorytetem dla urządzeń mobilnych
- **Accessibility:** WCAG AA compliance (kontrast 4.5:1, keyboard navigation, ARIA labels)
- **Security:** JWT auth, RLS policies, input validation (client + server)
- **Performance:** Code splitting, lazy loading, caching strategy

### 1.3 Podział na obszary funkcjonalne

**Public Area (niezalogowani użytkownicy):**
- Landing page z value proposition
- Rejestracja (signup)
- Logowanie (login)

**Protected Area (zalogowani użytkownicy):**
- Dashboard (central hub)
- Generator fiszek AI (wizard 3-krokowy)
- Lista fiszek (przeglądanie, edycja, zarządzanie)
- Sesja nauki (spaced repetition)
- Historia sesji generowania
- Ustawienia użytkownika

### 1.4 Kluczowe zasady UX

1. **Minimize Friction:** Modals zamiast osobnych stron gdzie sensowne (tworzenie fiszki, edycja)
2. **Immediate Feedback:** Loading states, optimistic updates, instant validation
3. **Error Prevention:** Proaktywny display limitów, walidacja przed submitem
4. **Context Preservation:** Auto-save drafts, URL sync dla filtrów
5. **Focus Mode:** Fullscreen learning bez dystrakcji
6. **Progressive Disclosure:** Pokaż essentials, resztę na żądanie

---

## 2. Lista widoków

### 2.1 PUBLIC ROUTES

#### Widok: Landing Page
- **Ścieżka:** `/`
- **Dostęp:** Public (redirect do `/dashboard` jeśli zalogowany)
- **Główny cel:** Prezentacja produktu i zachęcenie do rejestracji
- **Kluczowe informacje:**
  - Value proposition (AI-powered flashcard generation)
  - Główne benefity (oszczędność czasu, efektywna nauka)
  - Call-to-action (rozpocznij za darmo)
- **Kluczowe komponenty:**
  - Hero section z głównym przekazem
  - Features showcase (AI generation, spaced repetition, simple UX)
  - CTA buttons ("Rozpocznij za darmo" → `/signup`, "Zaloguj się" → `/login`)
  - Footer z links (privacy policy, terms of service - placeholders)
- **UX/Accessibility/Security:**
  - Semantic HTML (header, main, section, footer)
  - High contrast, czytelna typografia
  - Fast loading (statyczny Astro SSG)
  - Clear CTA hierarchy

#### Widok: Signup (Rejestracja)
- **Ścieżka:** `/signup`
- **Dostęp:** Public (redirect do `/dashboard` jeśli zalogowany)
- **Główny cel:** Umożliwienie nowym użytkownikom stworzenia konta
- **Kluczowe informacje:**
  - Formularz rejestracyjny
  - Email, password, confirm password
  - Display name (opcjonalnie)
- **Kluczowe komponenty:**
  - Form z React Hook Form + Zod validation
  - Email input (type="email", validation)
  - Password input (type="password", min 8 chars, strength indicator)
  - Confirm password (must match)
  - Display name input (opcjonalny, max 100 chars)
  - Submit button "Utwórz konto"
  - Link "Masz już konto? Zaloguj się" → `/login`
- **API Integration:**
  - `POST /api/auth/signup`
  - Response: auto-login → redirect `/dashboard`
- **UX/Accessibility/Security:**
  - Client-side validation (immediate feedback)
  - Server-side validation (security)
  - Clear error messages (field-specific)
  - Password strength indicator (visual feedback)
  - Duplicate email detection (409 error handling)
  - Labels z htmlFor, aria-describedby dla errors
  - Focus management (first field on load)
  - Loading state (disabled form + spinner podczas submit)

#### Widok: Login (Logowanie)
- **Ścieżka:** `/login`
- **Dostęp:** Public (redirect do `/dashboard` jeśli zalogowany)
- **Główny cel:** Umożliwienie powracającym użytkownikom zalogowania się
- **Kluczowe informacje:**
  - Formularz logowania
  - Email, password
- **Kluczowe komponenty:**
  - Form z React Hook Form + Zod validation
  - Email input (type="email")
  - Password input (type="password")
  - "Forgot password?" link (Supabase reset)
  - Submit button "Zaloguj się"
  - Link "Nie masz konta? Zarejestruj się" → `/signup`
- **API Integration:**
  - `POST /api/auth/login`
  - Response: redirect `/dashboard` (lub returnUrl z query param)
- **UX/Accessibility/Security:**
  - Generic error messages (security: nie ujawniaj czy email istnieje)
  - Client + server validation
  - Loading state podczas submit
  - Focus management
  - Labels + ARIA
  - Remember me (post-MVP)

---

### 2.2 PROTECTED ROUTES

#### Widok: Dashboard (Central Hub)
- **Ścieżka:** `/dashboard`
- **Dostęp:** Protected (middleware check)
- **Główny cel:** Centralny punkt nawigacji, przegląd statusu nauki, quick actions
- **Kluczowe informacje:**
  - Statystyki użytkownika (cards due today, total cards, AI %, acceptance rate)
  - Rate limiting status (pozostałe generacje dzisiaj)
  - Ostatnie sesje generowania (5 ostatnich)
  - Quick access do głównych funkcji
- **Kluczowe komponenty:**
  
  **Hero Section:**
  - Greeting: "Witaj, {displayName}!"
  - Motivational subheading
  
  **Stats Cards Grid (4 karty):**
  1. Cards Due Today
     - Liczba fiszek do powtórki
     - CTA "Rozpocznij naukę" (highlighted, jeśli > 0)
  2. Total Cards Created
     - Lifetime count wszystkich fiszek
  3. AI Generated %
     - Percentage fiszek z AI vs total
     - Target indicator (75%)
  4. Average Acceptance Rate
     - % zaakceptowanych z wygenerowanych
     - Target indicator (75%)
     - Color coding (green >75%, yellow 50-75%, red <50%)
  
  **Rate Limit Badge:**
  - "Pozostałe generacje dzisiaj: X/2"
  - Color: Green (2), Yellow (1), Red (0)
  - Tooltip z explanation i reset time (midnight)
  - Disabled state dla "Generuj" button gdy 0
  
  **Quick Actions (3 duże buttony):**
  1. "Generuj nowe fiszki" (Primary, gradient) → `/generate`
  2. "Rozpocznij naukę" (Success, green) → `/learn`
  3. "Przeglądaj fiszki" (Secondary, neutral) → `/flashcards`
  
  **Recent Activity (5 ostatnich sesji):**
  - Table/list z:
    - Date (relative: "2 godziny temu")
    - Input preview (50 chars + "...")
    - Generated/Accepted counts (badges)
    - Status (Success/Failed/Partial - color-coded)
  - Link "Zobacz całą historię" → `/sessions`

- **API Integration:**
  - `GET /api/profile/stats` → Stats cards
  - `GET /api/sessions?limit=5` → Recent activity

- **Loading States:**
  - Skeleton loaders dla stats cards (shimmer effect)
  - Skeleton rows dla recent activity table

- **Empty State (first-time user):**
  - Icon: Welcome illustration
  - Heading: "Witaj w 10xCards!"
  - Description: "Zacznij od wygenerowania pierwszych fiszek AI"
  - Primary CTA: "Generuj fiszki" → `/generate`
  - Secondary link: "Lub utwórz fiszkę ręcznie" → opens create modal

- **UX/Accessibility/Security:**
  - Clear visual hierarchy (hero → stats → actions → activity)
  - Keyboard navigation (tab order logical)
  - ARIA labels dla stats cards
  - Loading states announced (aria-live="polite")
  - Responsive grid (4 cols desktop, 2x2 tablet, stack mobile)
  - Auto-refresh stats on window focus (TanStack Query)

#### Widok: Generation Wizard (Generowanie fiszek AI)
- **Ścieżka:** `/generate`
- **Dostęp:** Protected
- **Główny cel:** Przeprowadzenie użytkownika przez proces generowania fiszek AI (3 kroki)
- **Kluczowe informacje:**
  - Step indicator (aktualny krok)
  - Input text (step 1)
  - Progress generowania (step 2)
  - Wygenerowane fiszki do przeglądu (step 3)

**STEP 1: Wklejanie Tekstu**
- **Główny cel:** Zebranie tekstu od użytkownika
- **Komponenty:**
  - Step indicator: "1. Tekst → 2. Generowanie → 3. Przegląd" (1 active)
  - Instructions: "Wklej tekst (1000-10000 znaków)"
  - Textarea (large, auto-resize)
    - Placeholder z przykładem
    - Live character counter "X / 10000 znaków"
    - Color changes near limits (yellow at 9000, red at 10000)
  - Draft indicator: "Szkic zapisany o {timestamp}" (auto-fade)
  - Restore draft banner (jeśli draft < 24h):
    - "Znaleziono zapisany szkic z {date}"
    - Buttons: "Przywróć" | "Odrzuć"
  - Navigation:
    - Button "Dalej" (Primary, disabled dopóki validation fails)
    - Link "Anuluj" → `/dashboard` (confirmation modal jeśli text entered)
- **Business Logic:**
  - Auto-save co 2s do localStorage (debounced)
  - Storage key: `generation_draft_{userId}`
  - Data: `{ text: string, timestamp: number }`
  - Clear draft po successful submission
- **Validation:**
  - Min 1000 chars
  - Max 10000 chars
  - Client-side (immediate feedback)
  - Error messages pod textarea

**STEP 2: Generowanie**
- **Główny cel:** Pokazanie progress AI generation
- **Komponenty:**
  - Full-screen progress modal (non-dismissable)
  - AI/sparkles animation icon
  - Heading: "Generowanie fiszek..."
  - Linear progress bar (0-100%, animated)
  - Estimated time: "Około 30 sekund"
  - Status text (dynamic updates if available)
  - Cancel button (Secondary): "Anuluj generowanie"
    - Returns to Step 1 z zachowanym tekstem
- **API Integration:**
  - `POST /api/generate` z `{ inputText: string }`
  - Response: `{ sessionId, generatedCards: [...], status }`
  - Polling (jeśli async) lub direct response
- **Error Handling:**
  - Modal z error message
  - "Spróbuj ponownie" button → back to step 1
  - "Wróć do Dashboard" button
  - Rate limit (429): "Przekroczono dzienny limit (2/2). Spróbuj jutro o {resetTime}"

**STEP 3: Przegląd i Edycja**
- **Główny cel:** Umożliwienie przeglądu, edycji i selekcji wygenerowanych fiszek
- **Komponenty:**
  - Step indicator: "1. Tekst → 2. Generowanie → 3. Przegląd" (3 active, 1-2 completed)
  - Header summary: "Wygenerowano X fiszek. Zaznacz które chcesz zapisać"
  - Vertical stack kart (wszystkie widoczne, NO pagination):
    
    Każda karta:
    - Checkbox (checked by default)
    - Card container
      - Front field:
        - Label "Pytanie"
        - Inline textarea (auto-resize, max 500 chars)
        - Character counter
      - Back field:
        - Label "Odpowiedź"
        - Inline textarea (auto-resize, max 1000 chars)
        - Character counter
      - Delete icon button (top-right corner)
        - Confirmation: "Czy na pewno usunąć tę fiszkę?"
  
  - Sticky bottom bar:
    - Selection summary: "Zaakceptowane: X/Y fiszek"
    - Actions:
      - "Zapisz wybrane" (Primary, disabled jeśli 0 selected)
      - "Odrzuć wszystkie" (Destructive, confirmation modal)
      - "Wstecz" (Secondary, warning modal o utracie zmian)

- **Validation:**
  - React Hook Form (array field)
  - Zod schema dla każdej karty
  - Real-time validation z inline errors
  - Server-side validation przed save

- **API Integration:**
  - `POST /api/generate/{sessionId}/accept` z:
    ```json
    {
      "cards": [
        { "id": "temp_uuid", "front": "...", "back": "..." }
      ]
    }
    ```
  - Success: Toast "X fiszek dodanych", redirect `/flashcards`
  - Error: Toast z retry, user stays na step 3

- **UX/Accessibility/Security:**
  - Linear progression (no skipping steps)
  - Clear visual feedback na każdym kroku
  - Loading states appropriate do kontekstu
  - Keyboard shortcuts (Enter dla "Dalej", Esc dla "Anuluj")
  - Focus management między krokami
  - Draft persistence (data loss prevention)
  - NO pagination w step 3 (max 5-10 kart, all visible)

#### Widok: Moje Fiszki (Lista fiszek)
- **Ścieżka:** `/flashcards`
- **Dostęp:** Protected
- **Główny cel:** Przeglądanie, filtrowanie, sortowanie, edycja i zarządzanie wszystkimi fiszkami użytkownika
- **Kluczowe informacje:**
  - Lista wszystkich fiszek z paginacją
  - Filtry (AI/Manual)
  - Sortowanie (data utworzenia, next review)
  - Stats per fiszka (source, next review date)

- **Kluczowe komponenty:**
  
  **Header Bar:**
  - Left:
    - Heading: "Moje Fiszki"
    - Count badge: "X fiszek"
  - Right:
    - Button "Dodaj fiszkę" (Primary) → opens create modal
  
  **Filter & Sort Bar:**
  - Filter dropdown:
    - Options: Wszystkie | AI Generated | Manual
    - Active filter highlighted
    - Sync z URL: `?source=ai_generated`
  - Sort dropdown:
    - Options: 
      - Data utworzenia (newest first)
      - Data utworzenia (oldest first)
      - Następna powtórka (soonest first)
    - Sync z URL: `?sort=created_at:desc`
  - Search box (post-MVP):
    - Placeholder: "Szukaj w fiszkach..."
  
  **Table/Card List (responsive):**
  - Desktop: Table view
  - Mobile: Card stack
  
  Columns/Fields:
  - Front (truncated 150 chars, tooltip z full text on hover)
  - Back (truncated 150 chars, tooltip z full text on hover)
  - Source badge:
    - "AI" icon (wand/sparkles) + label (blue)
    - "Manual" icon (pencil) + label (gray)
  - Next review date:
    - Formatted date
    - Relative time dla < 7 days ("Za 3 dni")
  - Actions dropdown:
    - Edit (opens inline edit mode)
    - Delete (immediate + undo toast 5s)
  
  **Inline Edit Mode:**
  - Click na row → transform to edit mode
  - Front i back → textareas (editable)
  - Buttons appear: "Zapisz" | "Anuluj"
  - Validation (max lengths)
  - Loading state w Save button podczas API call
  
  **Pagination:**
  - Page numbers (1 2 3 ... 10)
  - Items per page selector: 20 | 50 | 100
  - Total count display: "Pokazuję X-Y z Z fiszek"
  - Sync z URL: `?page=2&limit=20`

- **Create Modal** (FAB lub header button):
  - Modal centered (max-width 600px)
  - Header: "Utwórz nową fiszkę"
  - Form:
    - Front field (label "Pytanie", textarea max 500 chars)
    - Back field (label "Odpowiedź", textarea max 1000 chars)
    - Character counters
  - Footer:
    - "Utwórz fiszkę" (Primary)
    - "Anuluj" (Secondary)
  - Validation: React Hook Form + Zod
  - Success: Modal closes, toast "Fiszka utworzona", lista refetches

- **API Integration:**
  - `GET /api/flashcards?page=1&limit=20&source=ai&sort=created_at:desc` → List
  - `POST /api/flashcards` → Create
  - `PATCH /api/flashcards/{id}` → Update (inline edit)
  - `DELETE /api/flashcards/{id}` → Delete

- **Loading States:**
  - Initial load: Skeleton table rows (5-10)
  - Pagination/filter change: Subtle overlay + spinner
  - Inline edit save: Spinner w button + disabled

- **Empty State:**
  - Icon: Empty box/cards illustration
  - Heading: "Nie masz jeszcze żadnych fiszek"
  - Description: "Rozpocznij naukę generując fiszki AI lub tworząc je ręcznie"
  - Primary CTA: "Wygeneruj fiszki" → `/generate`
  - Secondary CTA: "Utwórz fiszkę" → opens create modal

- **Error Handling:**
  - Network error: Toast "Problem z połączeniem" + retry button
  - Validation error: Inline field errors
  - Delete undo: TanStack Query optimistic update + rollback

- **UX/Accessibility/Security:**
  - URL sync (bookmarkable filtered/sorted views)
  - Keyboard navigation (tab przez rows, Enter dla edit)
  - ARIA labels dla actions
  - Responsive table → cards na mobile
  - Optimistic updates dla lepszego UX
  - Undo delete (5s timeout)
  - Touch-friendly targets na mobile (44x44px min)

#### Widok: Sesja Nauki (Learning Session)
- **Ścieżka:** `/learn`
- **Dostęp:** Protected
- **Główny cel:** Distraction-free spaced repetition learning session
- **Kluczowe informacje:**
  - Aktualna fiszka (front/back)
  - Progress (X/Y kart)
  - Quality rating options (SM-2 algorithm)

- **Layout (Fullscreen Mode):**
  - Navbar HIDDEN (fullscreen focus)
  - Floating Exit button (top-right corner)
    - Icon: X lub Exit
    - Confirmation modal jeśli mid-session: "Przerwać sesję? Postęp zostanie utracony"
  - Progress bar (top, full width):
    - "X / Y kart" (centered text)
    - Linear progress fill
    - Color gradient (cool → warm as progress)

- **Card Display (vertically centered):**
  
  **FRONT VIEW (initial state):**
  - Card container (centered, max-width 800px)
  - Question text:
    - Large font (2rem desktop, 1.5rem mobile)
    - Scrollable jeśli długi
    - Subtle shadow/border
  - "Pokaż odpowiedź" button:
    - Primary, large, centered
    - Keyboard shortcut: Space
  
  **BACK VIEW (po "Pokaż odpowiedź"):**
  - Card container:
    - Question text (smaller, 1.25rem, at top dla context)
    - Subtle divider line
    - Answer text (large, 1.75rem, scrollable, highlighted background)
  
  - Quality Rating Buttons:
    - Desktop: Horizontal row, large buttons
    - Mobile: Vertical stack, full-width buttons
    
    Każdy button z:
    - Icon emoji
    - Main label
    - Sublabel (SM-2 value explanation)
    - Color coding
    - Keyboard shortcut (1-4)
    
    Buttons:
    1. 🔴 "Nie pamiętam" (quality 0-2)
       - bg-red-500
       - Sublabel: "Powtórka za kilka minut"
       - Keyboard: 1
    2. 🟠 "Trudne" (quality 3)
       - bg-orange-500
       - Sublabel: "Powtórka niedługo"
       - Keyboard: 2
    3. 🟢 "Dobre" (quality 4)
       - bg-green-500
       - Sublabel: "Dobry interwał"
       - Keyboard: 3
    4. 🔵 "Łatwe" (quality 5)
       - bg-blue-500
       - Sublabel: "Długi interwał"
       - Keyboard: 4

- **Session Flow:**
  1. Start: `GET /api/flashcards/due?limit=20`
  2. Check: Jeśli 0 → Empty state
  3. Display: Front view pierwszej karty
  4. Reveal: User klika "Pokaż odpowiedź" (lub Space)
  5. Rate: User wybiera quality (button lub keyboard 1-4)
  6. Submit: `POST /api/flashcards/{id}/review` z `{ quality: number }`
  7. Next: Auto-transition do next card (smooth fade 300ms)
  8. Complete: Po ostatniej → Success screen

- **Success Screen (completion):**
  - Completion icon: 🎉
  - Heading: "Świetna robota!"
  - Stats summary:
    - "Przejrzałeś X fiszek"
    - Breakdown: Y nie pamiętam, Z trudne, W dobre, V łatwe
    - Session time: "MM:SS"
  - Actions:
    - "Wróć do Dashboard" (Primary)
    - "Przejrzyj więcej" (Secondary, jeśli more cards available)

- **Empty State (0 due cards):**
  
  **Success variant:**
  - Icon: 🎉
  - Heading: "Wszystkie fiszki przejrzane!"
  - Description: "Następna powtórka: {nearest_review_date}"
  - Primary CTA: "Wróć do Dashboard"
  - Secondary CTA: "Przejrzyj wszystkie mimo to" (ignores due date)
  
  **Onboarding variant (0 total cards):**
  - Icon: Empty state illustration
  - Heading: "Nie masz jeszcze fiszek do nauki"
  - Description: "Wygeneruj pierwsze fiszki, aby rozpocząć"
  - Primary CTA: "Generuj fiszki" → `/generate`

- **API Integration:**
  - `GET /api/flashcards/due?limit=20` → Fetch due cards
  - `POST /api/flashcards/{id}/review` → Submit review

- **Loading States:**
  - Initial load: Centered spinner + "Ładowanie fiszek..."
  - Between cards: Subtle fade transition (no spinner)
  - API submission: Brief loading indicator (300ms delay przed pokazaniem)

- **Error Handling:**
  - Network error podczas review: Toast + auto-retry (3x exponential backoff)
  - Persistent error: "Nie udało się zapisać. Spróbuj ponownie" z manual retry button
  - Fallback: Save locally, sync later (post-MVP)

- **Keyboard Shortcuts:**
  - Space: Show answer / Continue
  - 1-4: Quality ratings (na back view)
  - Esc: Exit (z confirmation)

- **UX/Accessibility/Security:**
  - Fullscreen focus mode (no distractions)
  - Large, touch-friendly buttons (min 60px height na mobile)
  - Clear visual feedback na każdym kroku
  - Keyboard shortcuts dla power users
  - Progress visible zawsze
  - Smooth transitions (ale respect prefers-reduced-motion)
  - ARIA live regions dla screen readers
  - Focus management (button → next button)

#### Widok: Historia Sesji (Generation Sessions History)
- **Ścieżka:** `/sessions`
- **Dostęp:** Protected
- **Główny cel:** Audit trail wszystkich generation sessions, review past generations
- **Kluczowe informacje:**
  - Lista wszystkich sesji generowania
  - Input text preview
  - Generated/Accepted/Rejected counts
  - Status (success/failed/partial)
  - Metadata (model, time, tokens)

- **Kluczowe komponenty:**
  
  **Header:**
  - Heading: "Historia Generowania"
  - Subheading: "Przegląd wszystkich sesji AI"
  
  **Table/Card List:**
  - Desktop: Table view
  - Mobile: Card stack
  
  Columns:
  - Data (DD MMM YYYY, HH:MM, relative dla < 7 days)
  - Input Preview (first 100 chars + "... więcej")
  - Generated / Accepted / Rejected:
    - Badges z counts
    - Visual: "5 wygenerowano | 4 zaakceptowano | 1 odrzucono"
  - Status badge:
    - Success (green)
    - Failed (red)
    - Partial (yellow, jeśli rejected > 0)
  - Actions: Expand icon (chevron down/up)
  
  **Expandable Detail Section** (click na row):
  - Smooth expand animation
  - Sections:
    
    1. **Input Text:**
       - Full text (scrollable, max-height 300px)
       - Copy button (clipboard)
    
    2. **Accepted Cards:**
       - List kart (read-only)
       - Each: Front + Back (full text)
       - Link "Zobacz w Moje Fiszki" → `/flashcards` z highlight
    
    3. **Metadata:**
       - Model used: "anthropic/claude-3-5-sonnet"
       - Generation time: "2.5 sekund"
       - Tokens used: "450" (jeśli available)
       - Timestamp: Full datetime
    
    4. **Rejected Cards** (if any):
       - Count + brief preview
       - Collapsible list (optional expand)
  
  **Pagination:**
  - Standard component
  - 20 items per page
  - Page numbers
  - Total: "X sesji"

- **API Integration:**
  - `GET /api/sessions?page=1&limit=20` → List
  - `GET /api/sessions/{id}` → Detail (loaded on expand, cached)

- **Loading States:**
  - Initial load: Skeleton table rows
  - Expand row: Skeleton content dla detail section (jeśli not cached)
  - Pagination: Subtle overlay

- **Empty State:**
  - Icon: Document/history illustration
  - Heading: "Brak historii generowania"
  - Description: "Twoje sesje generowania AI pojawią się tutaj"
  - Primary CTA: "Generuj pierwsze fiszki" → `/generate`

- **UX/Accessibility/Security:**
  - Expandable rows (zmniejsza clutter)
  - Copy to clipboard functionality
  - Links do related flashcards
  - Responsive (table → cards na mobile)
  - Keyboard navigation (Enter dla expand)
  - ARIA controls (expanded state)
  - Audit trail (immutable data)

#### Widok: Settings (Ustawienia)
- **Ścieżka:** `/settings`
- **Dostęp:** Protected
- **Główny cel:** Zarządzanie profilem użytkownika i ustawieniami konta
- **Kluczowe informacje:**
  - Profile info (display name, email)
  - Account management (change password, delete account)
  - App info (version, policies)

- **Kluczowe komponenty:**
  
  **Sections (vertical stack, separated):**
  
  1. **Profile Section:**
     - Heading: "Profil"
     - Fields:
       - Display Name:
         - Inline edit (click to activate)
         - Save/Cancel buttons appear
         - Max 100 chars
       - Email:
         - Read-only (subtle text)
         - Note: "Skontaktuj się aby zmienić email"
  
  2. **Preferences Section** (disabled/greyed w MVP):
     - Heading: "Preferencje" + badge "[Wkrótce]"
     - Fields (all disabled):
       - Cards per session (dropdown, disabled)
       - Default sort order (dropdown, disabled)
     - Note: "Dostępne w przyszłej wersji"
  
  3. **Account Section:**
     - Heading: "Konto"
     - Actions:
       - Button "Zmień hasło" (Secondary):
         - Opens modal z instructions
         - Supabase password reset email
       - Button "Usuń konto" (Destructive):
         - Danger zone styling (red border)
         - Opens serious confirmation modal
         - Requires password re-entry
  
  4. **About Section:**
     - Heading: "O aplikacji"
     - Info:
       - Wersja: 1.0.0 (MVP)
       - Links: Privacy Policy | Terms of Service (external, placeholders)
       - Support: "Pomoc" link (post-MVP)

- **Change Password Modal:**
  - Heading: "Zmień hasło"
  - Content:
    - Info: "Wyślemy link do resetu hasła na Twój email"
    - Email display (read-only)
  - Actions:
    - "Wyślij link" → Supabase password reset
    - "Anuluj"
  - Success: Toast "Link wysłany, sprawdź email", modal closes

- **Delete Account Modal:**
  - Danger styling (red theme)
  - Heading: "⚠️ Usuń konto"
  - Content:
    - Strong warning: "Ta akcja jest NIEODWRACALNA"
    - List konsekwencji:
      - Wszystkie fiszki zostaną TRWALE usunięte
      - Historia sesji zostanie utracona
      - Dane NIE będą mogły być odzyskane
  - Password confirmation:
    - Input: "Wpisz hasło aby potwierdzić"
    - Validation (must match current password)
  - Actions:
    - "Usuń konto" (Destructive, disabled until password correct)
    - "Anuluj"
  - Success: Logout + redirect to landing + toast "Konto usunięte"

- **API Integration:**
  - `GET /api/profile` → Load profile data
  - `PATCH /api/profile` → Update display name
  - Supabase: Password reset email (built-in)
  - `DELETE /api/profile` (post-MVP, careful implementation needed)

- **UX/Accessibility/Security:**
  - Minimal settings (MVP scope)
  - Clear section separation
  - Inline editing (less navigation)
  - Serious warnings dla destructive actions
  - Password confirmation dla delete (security)
  - Loading states dla async operations
  - Disabled state dla post-MVP features (transparency)

---

## 3. Mapa podróży użytkownika

### 3.1 User Journey: Nowy użytkownik (First-Time Experience)

**Krok 1: Discovery**
- User trafia na landing page `/`
- Czyta value proposition: "Twórz fiszki 10x szybciej z AI"
- Klika "Rozpocznij za darmo"

**Krok 2: Onboarding**
- Redirect do `/signup`
- Wypełnia formularz (email, password, display name)
- Submit → auto-login
- Redirect do `/dashboard`

**Krok 3: Empty Dashboard (First Visit)**
- Widzi empty state:
  - "Witaj w 10xCards!"
  - "Zacznij od wygenerowania pierwszych fiszek"
- Klika "Generuj fiszki"

**Krok 4: Generation Wizard**
- Redirect do `/generate`
- Step 1: Wkleja tekst (np. fragment książki, 2000 znaków)
- Widzi character counter, validation OK
- Klika "Dalej"
- Step 2: Progress modal "Generowanie fiszek..." (30s)
- API generuje 7 fiszek
- Step 3: Przegląd:
  - Widzi 7 wygenerowanych fiszek (wszystkie checked)
  - Może edytować treść
  - Odznacza 1 fiszkę (nie podoba się)
  - Klika "Zapisz wybrane" (6 zaakceptowanych)
- Toast: "6 fiszek dodanych"
- Redirect do `/flashcards`

**Krok 5: Moje Fiszki**
- Widzi listę 6 nowych fiszek
- Wszystkie mają badge "AI"
- Next review: "Dzisiaj"
- Klika "Rozpocznij naukę" (lub wraca do dashboard)

**Krok 6: Pierwsza Sesja Nauki**
- Redirect do `/learn`
- Fullscreen mode
- Widzi "1 / 6 kart"
- Pierwsza fiszka: "Co to jest X?"
- Klika "Pokaż odpowiedź"
- Czyta odpowiedź
- Ocenia: "Dobre" (quality 4)
- Auto-transition do następnej karty
- Repeat dla wszystkich 6 kart
- Success screen: "Świetna robota! Przejrzałeś 6 fiszek"
- Klika "Wróć do Dashboard"

**Krok 7: Dashboard z danymi**
- Widzi statystyki:
  - Cards Due Today: 0
  - Total Cards: 6
  - AI Generated: 100%
  - Acceptance Rate: 85.7% (6/7)
- Rate limit: "Pozostałe generacje dzisiaj: 1/2"
- Recent activity: 1 sesja
- User ma pełen obraz swojego progress

### 3.2 User Journey: Returning User (Daily Review)

**Krok 1: Login**
- User wchodzi na `/login`
- Wpisuje credentials
- Submit → redirect `/dashboard`

**Krok 2: Dashboard**
- Widzi:
  - Cards Due Today: 12 (highlighted)
  - Remaining generations: 2/2 (reset po midnight)
  - Recent activity
- Klika "Rozpocznij naukę" (duży green button)

**Krok 3: Review Session**
- Redirect do `/learn`
- 20 kart do przeglądu (limit)
- Przegląda metodycznie:
  - Niektóre "Łatwe" → long interval
  - Niektóre "Trudne" → short interval
  - Kilka "Nie pamiętam" → reset to day 1
- Po 20 kartach: Success screen
- Klika "Przejrzyj więcej" (jeśli więcej available)

**Krok 4: Optional - Dodanie ręcznej fiszki**
- Wraca do dashboard
- Klika "Przeglądaj fiszki"
- W `/flashcards` klika FAB "+"
- Modal: Create flashcard
- Wpisuje pytanie i odpowiedź
- Submit → fiszka utworzona
- Toast: "Fiszka utworzona"

### 3.3 User Journey: Generate More Cards

**Krok 1: Check Limit**
- User na dashboard
- Widzi "Pozostałe generacje: 1/2"
- Klika "Generuj nowe fiszki"

**Krok 2: Generation Flow**
- Redirect do `/generate`
- Restore draft banner (jeśli był poprzedni draft):
  - "Znaleziono szkic z wczoraj"
  - Klika "Odrzuć" (chce nowy tekst)
- Wkleja nowy tekst
- Auto-save działa (widzi "Szkic zapisany")
- Klika "Dalej" → generowanie → przegląd → akceptacja
- Success

**Krok 3: Limit Reached**
- Wraca do dashboard
- Badge: "Pozostałe generacje: 0/2" (red)
- "Generuj" button disabled z tooltip:
  - "Dzienny limit osiągnięty (2/2)"
  - "Następna generacja o północy"
- User może tylko przeglądać i uczyć się

### 3.4 User Journey: Review Generation History

**Krok 1: Dashboard**
- User widzi "Recent Activity" (5 sesji)
- Klika "Zobacz całą historię"

**Krok 2: Sessions History**
- Redirect do `/sessions`
- Widzi tabelę wszystkich sesji (paginacja)
- Klika na row (expand)

**Krok 3: Session Details**
- Expandable section shows:
  - Full input text
  - Accepted cards (links do flashcards)
  - Metadata (model, time, tokens)
- Może click "Zobacz w Moje Fiszki" → redirect z highlight
- Może copy input text (do re-use)

### 3.5 User Journey: Settings & Profile

**Krok 1: Access Settings**
- User klika user menu (top-right navbar)
- Dropdown shows:
  - Profil
  - Ustawienia
  - Wyloguj
- Klika "Ustawienia"

**Krok 2: Settings**
- Redirect do `/settings`
- Widzi profile info
- Klika display name → inline edit
- Zmienia nazwę, klika "Zapisz"
- Toast: "Profil zaktualizowany"

**Krok 3: Change Password**
- Klika "Zmień hasło"
- Modal z info
- Klika "Wyślij link"
- Toast: "Link wysłany"
- Sprawdza email, resetuje hasło (external Supabase flow)

---

## 4. Układ i struktura nawigacji

### 4.1 Top Navbar (Persistent)

**Layout:**
```
[Logo + "10xCards"] [Dashboard] [Generuj] [Moje Fiszki] [Historia] ... [User Menu ▼]
```

**Left Section:**
- Logo + "10xCards" text
- Click → redirect `/dashboard`

**Center Section (Navigation Links):**
- Dashboard → `/dashboard`
- Generuj → `/generate`
- Moje Fiszki → `/flashcards`
- Historia Sesji → `/sessions`

**Right Section:**
- User menu (dropdown):
  - Display name + avatar (initial)
  - Dropdown items:
    - Ustawienia → `/settings`
    - Wyloguj → `POST /api/auth/logout` → redirect `/`

**Mobile Version:**
- Hamburger menu (top-left)
- Logo (center)
- User avatar (top-right)
- Slide-in drawer z navigation links

**Visibility:**
- Visible: Wszystkie protected routes EXCEPT `/learn`
- Hidden: `/learn` (fullscreen focus mode)
- Not shown: Public routes (landing, login, signup)

### 4.2 Breadcrumbs (Opcjonalne, post-MVP)

**Przykład:**
- `/flashcards` → "Dashboard / Moje Fiszki"
- `/generate` (step 3) → "Dashboard / Generuj / Przegląd"

**MVP:** Skip breadcrumbs (prostsza nawigacja)

### 4.3 Footer

**Content:**
- © 2025 10xCards
- Links: Privacy Policy | Terms of Service
- Version: 1.0.0 (MVP)

**Visibility:**
- Landing page: Visible
- Protected routes: Hidden (focus na content)
- Post-MVP: Może być visible na niektórych routes

### 4.4 Floating Action Buttons (FAB)

**Moje Fiszki (`/flashcards`):**
- FAB "+" (bottom-right corner)
- Click → opens Create Flashcard modal
- Sticky position
- Z-index nad content
- Hidden on scroll down, visible on scroll up (UX pattern)

### 4.5 Back Navigation

**Browser Back Button:**
- Standard browser behavior
- History stack maintained
- URL state preserved (filters, pagination)

**In-App Back:**
- Generation wizard: "Wstecz" button (z warning)
- Modals: "Anuluj" button lub X icon
- Learning session: "Exit" button (z confirmation)

### 4.6 Navigation Patterns

**Primary Navigation:** Top navbar (główne sekcje)
**Secondary Navigation:** In-page tabs/filters (np. w `/flashcards`)
**Tertiary Navigation:** Dropdowns, modals (actions)

**Flow Navigation:**
- Generation wizard: Linear steps (1 → 2 → 3)
- Learning session: Sequential cards (auto-advance)

**Keyboard Navigation:**
- Tab order: Logical i sequential
- Skip to main content (visually hidden link)
- Keyboard shortcuts (Space, Esc, 1-4 w learning)

---

## 5. Kluczowe komponenty

### 5.1 Komponenty UI (shadcn/ui based)

#### Button Component
- **Warianty:** Primary, Secondary, Destructive, Ghost, Link
- **Sizes:** Small, Medium, Large
- **States:** Default, Hover, Active, Disabled, Loading
- **Accessibility:** Focus ring, ARIA labels
- **Usage:** CTA buttons, form submits, actions

#### Input Component
- **Types:** Text, Email, Password, Textarea
- **Features:** Label, placeholder, error message, character counter
- **States:** Default, Focus, Error, Disabled
- **Validation:** Real-time (React Hook Form + Zod)
- **Accessibility:** htmlFor labels, aria-describedby dla errors

#### Card Component
- **Struktur:** Header, Content, Footer
- **Variants:** Default, Hoverable, Clickable
- **Usage:** Stats cards, flashcard display, session cards
- **Responsive:** Stack na mobile, grid na desktop

#### Modal Component
- **Types:** Centered, Fullscreen (mobile)
- **Features:** Header, content, footer, close button
- **Behavior:** Focus trap, Esc to close, backdrop click to close
- **Accessibility:** Focus management, ARIA role="dialog"
- **Usage:** Create flashcard, confirmations, password change

#### Dropdown Menu
- **Trigger:** Button, avatar, icon
- **Content:** Menu items (links, buttons, separators)
- **Positioning:** Auto (Radix Popover)
- **Keyboard:** Arrow keys, Enter, Esc
- **Usage:** User menu, actions menu, filters

#### Toast Notifications
- **Types:** Success, Error, Info, Warning
- **Features:** Icon, message, action button, auto-dismiss
- **Position:** Bottom-right (desktop), top-center (mobile)
- **Duration:** 5s default, persistent dla undo actions
- **Accessibility:** aria-live="polite"
- **Usage:** Feedback messages, undo delete

#### Badge Component
- **Variants:** Default, Success, Warning, Destructive, Info
- **Sizes:** Small, Medium
- **Usage:** Status indicators, counts, labels (AI/Manual)

#### Skeleton Loader
- **Shimmer animation:** Subtle pulse
- **Shapes:** Rectangle, Circle, Text lines
- **Usage:** Loading states (stats cards, table rows, content)

#### Progress Bar
- **Types:** Linear, Circular
- **Indeterminate:** Dla unknown duration
- **Determinate:** 0-100% dla known progress
- **Usage:** AI generation progress, session progress

### 5.2 Złożone komponenty (Custom)

#### StatsCard Component
- **Props:** title, value, icon, change (optional), color, onClick
- **Layout:** Icon + Value + Title + Change indicator
- **Responsive:** Grid (4-2-1 columns)
- **Usage:** Dashboard stats

#### FlashcardCard Component
- **Props:** front, back, source, nextReview, onEdit, onDelete
- **Layout:** Front (truncated) + Back (truncated) + Meta + Actions
- **States:** Default, Edit mode, Hover
- **Usage:** Flashcards list

#### StudyCard Component
- **Props:** front, back, isFlipped, onFlip, onRate
- **Layout:** Centered card + Flip button + Rating buttons
- **Animation:** Smooth flip (optional, respect prefers-reduced-motion)
- **Usage:** Learning session

#### QualityRatingButtons Component
- **Props:** onRate (callback z quality value)
- **Layout:** 4 buttons (Nie pamiętam, Trudne, Dobre, Łatwe)
- **Responsive:** Horizontal row (desktop), Vertical stack (mobile)
- **Keyboard:** 1-4 shortcuts
- **Usage:** Learning session review

#### GenerationStepIndicator Component
- **Props:** currentStep (1-3)
- **Layout:** 3 steps z lines między
- **States:** Active, Completed, Upcoming
- **Visual:** Numbers/icons + Labels + Connection lines
- **Usage:** Generation wizard

#### SessionHistoryRow Component
- **Props:** session data, isExpanded, onToggle
- **Layout:** Summary row + Expandable detail section
- **Animation:** Smooth expand/collapse
- **Usage:** Sessions history list

### 5.3 Layout komponenty

#### DashboardLayout
- **Structure:** Navbar + Main content + (optional Footer)
- **Padding:** Consistent spacing
- **Max-width:** Container (1280px)
- **Usage:** All protected routes (except `/learn`)

#### FullscreenLayout
- **Structure:** Floating exit + Content (vertically centered)
- **Background:** Subtle gradient
- **No navbar, no footer**
- **Usage:** `/learn` only

#### WizardLayout
- **Structure:** Step indicator + Main content + Navigation buttons
- **Progress:** Visual step tracker
- **Navigation:** Back/Next buttons (context-aware)
- **Usage:** `/generate`

### 5.4 Formularze i walidacja

#### FormField Component (shadcn/ui Form)
- **Integration:** React Hook Form
- **Structure:** Label + Input + Error message + Help text
- **Validation:** Zod schemas
- **Accessibility:** Full ARIA support
- **Usage:** All forms (login, signup, create flashcard, edit profile)

#### Zod Schemas (shared)
- **flashcardSchema:** front (1-500), back (1-1000)
- **signupSchema:** email, password (min 8), confirmPassword
- **loginSchema:** email, password
- **profileSchema:** displayName (max 100)
- **generateSchema:** inputText (1000-10000)

### 5.5 Error Boundary Component

#### GlobalErrorBoundary
- **Props:** fallback component
- **Behavior:** Catch React errors, display fallback UI
- **Fallback UI:**
  - Icon: Error illustration
  - Heading: "Coś poszło nie tak"
  - Description: Generic message (no technical details)
  - Actions: "Odśwież stronę" | "Wróć do Dashboard"
- **Logging:** Console error (dev), external logging (prod - post-MVP)
- **Usage:** Wrap entire app

### 5.6 State Management Helpers

#### useAuth Hook
- **Returns:** user, isLoading, isAuthenticated
- **Integration:** Supabase Auth + TanStack Query
- **Usage:** Protected routes, user menu

#### useFlashcards Hook
- **Params:** filters (source, sort, page, limit)
- **Returns:** flashcards, isLoading, error, refetch
- **Caching:** 1 min staleTime
- **Usage:** `/flashcards` list

#### useDueFlashcards Hook
- **Params:** limit (default 20)
- **Returns:** dueCards, count, isLoading
- **Caching:** 0 staleTime (real-time)
- **Usage:** `/learn` session

#### useProfileStats Hook
- **Returns:** stats object, isLoading
- **Caching:** 1 min staleTime
- **Refetch:** On window focus
- **Usage:** Dashboard stats cards

#### useGenerationMutation Hook
- **Mutation:** POST /api/generate
- **Side effects:** Update profile stats, sessions list
- **Error handling:** Toast notifications
- **Usage:** Generation wizard step 2

#### useFlashcardMutations Hook
- **Mutations:** create, update, delete
- **Optimistic updates:** Immediate UI feedback
- **Rollback:** On error
- **Invalidation:** Refetch lists on success
- **Usage:** Flashcards CRUD operations

---

## 6. Względy UX, dostępności i bezpieczeństwa

### 6.1 User Experience (UX)

**Zasady przewodnie:**
1. **Minimize Clicks:** Modal dla quick actions (create flashcard)
2. **Immediate Feedback:** Loading states, optimistic updates, validation
3. **Error Prevention:** Disable invalid actions, show limits proactively
4. **Context Preservation:** Auto-save drafts, URL state, localStorage
5. **Progressive Disclosure:** Show essentials, hide complexity
6. **Consistency:** Jednolite patterns (buttons, colors, spacing)

**Loading States (context-specific):**
- Initial page load → Skeleton loaders (shimmer)
- Button actions → Spinner w button + disabled
- AI generation → Progress modal z bar
- Pagination/filters → Subtle overlay
- Background refetch → Minimal indicator

**Empty States (actionable):**
- Icon/illustration (friendly, colorful)
- Heading (clear, concise)
- Description (benefit-focused)
- Primary CTA (specific action)
- Secondary CTA/link (alternative)

**Error Handling (user-friendly):**
- Polish messages (nie technical jargon)
- Specific suggestions (jak fix)
- Retry options gdzie sensowne
- Graceful degradation (fallbacks)

**Responsiveness:**
- Mobile-first design
- Touch-friendly targets (44x44px min)
- Readable typography (16px base)
- Accessible gestures (no complex swipes)
- Adaptive layouts (grid → stack)

### 6.2 Accessibility (WCAG AA)

**Color & Contrast:**
- Text/background: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum
- No color-only indicators (icon + text)

**Keyboard Navigation:**
- Tab order: Logical sequence
- Focus indicators: Visible (ring-2)
- Skip to main content link
- Keyboard shortcuts (documented)
- Modal focus traps (Radix)

**Screen Readers:**
- Semantic HTML (nav, main, article, section)
- ARIA labels dla icon buttons
- ARIA live regions (toasts, loading)
- Alt text (meaningful lub empty dla decorative)
- Form field descriptions (aria-describedby)

**Forms:**
- Labels z htmlFor
- Required indicators (visual + aria-required)
- Error messages linked (aria-describedby)
- Field hints accessible
- Error summary at top (jeśli multiple errors)

**Motion & Animation:**
- Respect prefers-reduced-motion
- No auto-playing animations
- Transitions < 300ms (perceived instant)
- Smooth but not distracting

**Focus Management:**
- Modal open → focus first element
- Modal close → return focus to trigger
- Page navigation → focus main heading
- Error → focus first error field

### 6.3 Security

**Authentication:**
- JWT tokens (1h access, long-lived refresh)
- Automatic refresh (Supabase SDK)
- Secure storage (httpOnly cookies dla refresh)
- No manual localStorage dla sensitive tokens

**Authorization:**
- Row Level Security (database-level)
- Astro middleware (route protection)
- API auth check (every request)
- No client-side role checks (unreliable)

**Input Validation:**
- Client-side (UX, immediate feedback)
- Server-side (security, enforcement)
- Zod schemas (shared definitions)
- Database constraints (last line of defense)
- Sanitization (trim, escape)

**XSS Prevention:**
- React auto-escaping (default)
- No dangerouslySetInnerHTML
- No user HTML content (plain text only)
- CSP headers (post-MVP)

**CSRF Protection:**
- Token-based auth (not cookies)
- SameSite cookie policy (post-MVP)
- Supabase handles (built-in)

**Rate Limiting:**
- AI generation: 2/day per user
- Database-level tracking
- Proactive display (dashboard badge)
- 429 errors z clear messages

**Secure Communication:**
- HTTPS only (enforced)
- No sensitive data w URLs
- No API keys w client code
- Environment variables dla secrets

**Error Handling (security perspective):**
- Generic user messages (no leaks)
- Detailed server logs (monitoring)
- No stack traces w production
- No user data w error messages

**Session Management:**
- Auto-logout on token expiry
- Refresh token rotation
- Logout clears all cache (TanStack Query)
- No "remember me" w MVP

**Dependency Security:**
- Regular npm audit
- Automated updates (Dependabot)
- Pin major versions
- Review security advisories

---

## 7. Integracja z API

### 7.1 API Client Architecture

**Base Client (`src/lib/api/client.ts`):**
```typescript
class ApiClient {
  private baseURL = '/api'
  private supabase = createClient()
  
  async request(endpoint, options) {
    // Auto-inject auth header
    const session = await this.supabase.auth.getSession()
    const headers = {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
    // Fetch z error handling
  }
}
```

**Feature-specific modules:**
- `flashcardsApi` → `/api/flashcards/*`
- `generationApi` → `/api/generate/*`
- `sessionsApi` → `/api/sessions/*`
- `profileApi` → `/api/profile/*`
- `authApi` → `/api/auth/*`

### 7.2 Mapowanie widoków do API

| Widok | API Endpoints | Metody |
|-------|--------------|--------|
| Dashboard | `/api/profile/stats`, `/api/sessions?limit=5` | GET |
| Generate (step 1) | - | - |
| Generate (step 2) | `/api/generate` | POST |
| Generate (step 3) | `/api/generate/{sessionId}/accept` | POST |
| Flashcards List | `/api/flashcards?page=X&limit=Y&source=Z&sort=W` | GET |
| Flashcard Create | `/api/flashcards` | POST |
| Flashcard Edit | `/api/flashcards/{id}` | PATCH |
| Flashcard Delete | `/api/flashcards/{id}` | DELETE |
| Learn Session | `/api/flashcards/due?limit=20` | GET |
| Review Card | `/api/flashcards/{id}/review` | POST |
| Sessions List | `/api/sessions?page=X&limit=Y` | GET |
| Session Detail | `/api/sessions/{id}` | GET |
| Profile | `/api/profile` | GET, PATCH |
| Auth | `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout` | POST |

### 7.3 State Management Strategy

**TanStack Query (React Query):**
- Server state caching
- Automatic refetching
- Optimistic updates
- Error handling
- Background updates

**Query Keys Convention:**
```typescript
['auth', 'user'] // Current user
['profile'] // User profile
['profile', 'stats'] // User statistics
['flashcards', filters] // Flashcards list
['flashcards', 'due', limit] // Due cards
['flashcard', id] // Single flashcard
['sessions', filters] // Generation sessions
['session', id] // Single session detail
```

**Cache Configuration:**
```typescript
{
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min default
      retry: 3,
      retryDelay: exponential backoff,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    }
  }
}
```

**Specific Overrides:**
- Profile: 5 min staleTime (rarely changes)
- Due cards: 0 staleTime (real-time accuracy)
- Stats: 1 min staleTime + refetch on focus

### 7.4 Error Handling Strategy

**HTTP Status → UI Response:**
- `200-299` → Success (show success state)
- `400` → Validation error (show field errors)
- `401` → Unauthorized (redirect to login)
- `403` → Forbidden (show error message)
- `404` → Not found (show empty state)
- `409` → Conflict (show specific error, e.g. duplicate email)
- `429` → Rate limit (show countdown to reset)
- `500-599` → Server error (show retry button + toast)

**Network Errors:**
- Timeout → Toast "Problem z połączeniem" + retry
- Offline → Toast "Brak połączenia" + retry when online
- DNS → Generic error message

**Retry Logic:**
- GET requests: 3x exponential backoff
- POST/PATCH/DELETE: 1x (avoid duplicates)
- 429 errors: No retry (respect rate limit)

---

## 8. Implementacja progresywna (Fazy MVP)

### Phase 1: Foundation (Week 1-2)
- [ ] Setup Astro 5 project + dependencies
- [ ] Configure Tailwind 4 + shadcn/ui
- [ ] Setup Supabase client
- [ ] Implement middleware (auth protection)
- [ ] Create base layouts (Dashboard, Fullscreen, Wizard)
- [ ] Build UI components (Button, Input, Card, Modal)

### Phase 2: Authentication (Week 2)
- [ ] Landing page (basic)
- [ ] Signup page + form + validation
- [ ] Login page + form + validation
- [ ] Auth API integration
- [ ] User menu component
- [ ] Logout functionality

### Phase 3: Core Features (Week 3-5)
- [ ] Dashboard (stats cards, quick actions, recent activity)
- [ ] Flashcards list (filters, sort, pagination)
- [ ] Create flashcard (modal + form)
- [ ] Edit/delete flashcards (inline + undo)
- [ ] Generation wizard (3 steps)
- [ ] API integration (generate + accept)

### Phase 4: Learning (Week 5-6)
- [ ] Due cards fetch
- [ ] Study card component
- [ ] Quality rating buttons
- [ ] Review submission
- [ ] Session flow (front → back → rate → next)
- [ ] Empty states (0 due cards)
- [ ] Success screen

### Phase 5: Polish (Week 6-7)
- [ ] Sessions history (list + detail)
- [ ] Settings page (profile, password, delete account)
- [ ] Loading states (skeletons, spinners)
- [ ] Error handling (boundaries, toasts)
- [ ] Empty states (all contexts)
- [ ] Responsive testing (mobile, tablet, desktop)
- [ ] Accessibility audit (WCAG AA)

### Phase 6: Testing & Launch (Week 7-8)
- [ ] E2E testing (key flows)
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Security review
- [ ] Beta testing (small group)
- [ ] Production deployment

---

## 9. Metryki sukcesu UI

**Techniczne:**
- Lighthouse score > 90 (Performance, Accessibility, Best Practices)
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Zero critical accessibility violations (axe-core)

**Biznesowe:**
- AI Acceptance Rate ≥ 75% (KPI z PRD)
- AI Usage Rate ≥ 75% (KPI z PRD)
- Daily Active Users retention > 40% (week 1)
- Average session duration > 5 min

**User Experience:**
- Task success rate > 90% (user testing)
- System Usability Scale (SUS) > 70
- Net Promoter Score (NPS) > 30 (post-MVP)
- Bug reports < 5 per 100 sessions

---

## 10. Obszary do dalszej optymalizacji (Post-MVP)

**UX Enhancements:**
- Dark mode (CSS variables ready)
- Rich text formatting (Markdown support)
- Drag-and-drop card reordering
- Keyboard shortcuts panel (visible overlay)
- Onboarding tour (Intro.js)

**Features:**
- Full-text search (Postgres tsvector)
- Export/Import (JSON, CSV, Anki)
- Collaborative decks (sharing)
- Mobile apps (PWA or native)
- Real-time sync (Supabase Realtime)

**Performance:**
- Virtual scrolling (long lists)
- Service workers (offline capability)
- CDN dla static assets
- Image optimization (if images added)

**Analytics:**
- User behavior tracking (Plausible/Mixpanel)
- A/B testing infrastructure (feature flags)
- Error monitoring (Sentry)
- Performance monitoring (Real User Monitoring)

**Accessibility:**
- Professional accessibility audit
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Cognitive accessibility (plain language, simplified flows)
- Internationalization (i18n framework)

---

**Dokument przygotowany:** 2025-10-26  
**Autor:** AI Architecture Assistant  
**Status:** Zatwierdzony do implementacji  
**Wersja:** 1.0 (MVP)

