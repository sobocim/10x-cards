# 🎯 Architektura UI dla 10xCards MVP

**Wersja:** 1.0  
**Data:** 2025-10-26  
**Status:** Zatwierdzona

## Wprowadzenie

Niniejszy dokument zawiera kompletną architekturę interfejsu użytkownika dla projektu 10xCards MVP, opracowaną na podstawie:
- **PRD** (Product Requirements Document)
- **API Plan** (REST API specification)
- **Tech Stack** (Astro 5, React 19, TypeScript, Tailwind 4, shadcn/ui)

Wszystkie decyzje projektowe zostały zatwierdzone i są gotowe do implementacji.

---

## 📐 Struktura Aplikacji

### Routing i Nawigacja

**Public Routes:**
- `/` - Landing page z hero section, value proposition, CTA buttons
- `/login` - Formularz logowania
- `/signup` - Formularz rejestracji

**Protected Routes** (wymagają autentykacji):
- `/dashboard` - Główny widok po zalogowaniu
- `/generate` - Wizard generowania fiszek AI (3 kroki)
- `/flashcards` - Lista wszystkich fiszek użytkownika
- `/learn` - Sesja nauki (fullscreen mode)
- `/sessions` - Historia sesji generowania
- `/settings` - Ustawienia użytkownika

**Middleware:**
- Astro middleware sprawdza `locals.supabase.auth.getUser()`
- Automatic redirect do `/login` dla niezalogowanych
- Zalogowani użytkownicy na `/` → redirect do `/dashboard`

---

## 🧭 Główna Nawigacja

**Top Navbar** (persistent, hidden tylko w `/learn`):
- **Lewo:** Logo + "10xCards" → link do dashboard
- **Centrum:** Dashboard | Generuj | Moje Fiszki | Historia Sesji
- **Prawo:** User menu dropdown (profile info, settings, logout)
- **Mobile:** Hamburger menu (collapsed)

**W sesji nauki:**
- Navbar ukryty (fullscreen focus mode)
- Floating "Exit" button w górnym rogu

---

## 🎨 Design System

### Kolory i Theming
- **Mode:** Light only (MVP)
- **Primary:** Niebieski/fioletowy gradient (AI associations)
- **Semantic:** Success (zielony), Warning (żółty), Destructive (czerwony)
- **Neutrals:** Gray scale z WCAG AA contrast (4.5:1)
- **System:** shadcn/ui CSS variables (`--primary`, `--background`, `--foreground`)

### Typography i Spacing
- Tailwind 4 utility classes
- Responsive typography scale
- Consistent spacing system (4px base unit)

---

## 📱 Kluczowe Widoki

### 1. Dashboard (`/dashboard`)

**Layout:**
```
[Navbar]
[Hero Section z greeting]
[Stats Cards Grid - 4 karty]
  - Cards Due Today (z CTA)
  - Total Cards Created
  - AI Generated (%)
  - Average Acceptance Rate
[Quick Actions - 3 duże buttony]
  - Generuj nowe fiszki
  - Rozpocznij naukę
  - Przeglądaj fiszki
[Recent Activity - ostatnie 5 sesji]
```

**Data Sources:**
- `GET /api/profile/stats` - statystyki
- `GET /api/sessions?limit=5` - ostatnie sesje

**Loading States:**
- Skeleton loaders dla cards i list

**Empty States:**
- "Witaj! Zacznij od wygenerowania pierwszych fiszek"
- Primary CTA do `/generate`

**Rate Limit Display:**
- Badge: "Pozostałe generacje dzisiaj: X/2"
- Disabled button z tooltip gdy limit osiągnięty

---

### 2. Generation Wizard (`/generate`)

**3-krokowy linear wizard:**

#### Step 1: Wklejanie Tekstu
```
[Step Indicator: 1. Tekst → 2. Generowanie → 3. Przegląd]
[Textarea - 1000-10000 znaków]
  - Live character counter
  - Client-side validation
  - Auto-save do localStorage (co 2s)
  - "Draft saved" indicator
[Button: Dalej (disabled dopóki validation nie ok)]
```

**Draft Management:**
- Auto-save co 2s z timestamp
- "Restore draft" option przy ponownym wejściu (< 24h)

#### Step 2: Generowanie
```
[Progress Modal]
  - Linear progress bar (0-100%)
  - "Generowanie fiszek..."
  - Estimated time
  - Cancel button (wraca do step 1 z tekstem)
[POST /api/generate]
```

#### Step 3: Przegląd i Edycja
```
[Vertical stack kart]
Każda karta:
  - Checkbox (checked by default)
  - Editable front field (inline textarea)
  - Editable back field (inline textarea)
  - Delete icon button

[Summary bar na dole]
  - "Zaakceptowane: X/Y"
  - Primary button: "Zapisz wybrane"
  - Secondary button: "Odrzuć wszystkie"
  - "Wstecz" (z warning modal)

[POST /api/generate/{sessionId}/accept]
```

**Validation:**
- React Hook Form + Zod schemas
- Client-side + server-side validation
- Real-time error display

---

### 3. Moje Fiszki (`/flashcards`)

**Layout:**
```
[Header]
  - Title: "Moje Fiszki"
  - Button: "Dodaj fiszkę" (otwiera modal)
  - Filter dropdown: Wszystkie/AI/Ręczne
  - Sort dropdown: Data utworzenia/Następna powtórka

[Table/Card List]
  - Front (truncated 150 chars)
  - Back (truncated 150 chars)
  - Source badge (AI/Manual)
  - Next review date
  - Actions (Edit, Delete)

[Pagination]
  - Page numbers
  - Items per page: 20/50/100
```

**Features:**
- Inline editing on click (transform do edit mode)
- Delete z undo toast (5s timeout)
- Filters sync z URL query params
- Skeleton loading dla initial load
- Loading overlay dla pagination/filters

**API:**
- `GET /api/flashcards?page=1&limit=20&source=X&sort=created_at:desc`

**Empty State:**
- Icon + "Nie masz jeszcze żadnych fiszek"
- Description + CTA "Wygeneruj fiszki" / "Dodaj fiszkę"

**Create Modal:**
- Floating Action Button (FAB) "+"
- Modal z formem (front + back textareas)
- Character counters
- Validation + submit → `POST /api/flashcards`

---

### 4. Sesja Nauki (`/learn`)

**Fullscreen Mode:**
```
[Floating Exit button - góra prawo]

[Progress bar - góra]
"X/Y kart"

[Card Display - centered]
FRONT VIEW:
  [Pytanie - duży font]
  [Button: "Pokaż odpowiedź"]

BACK VIEW (po kliknięciu):
  [Pytanie - mniejszy font, na górze]
  [Odpowiedź - duży font, scrollable jeśli długa]
  
  [Quality Rating Buttons - vertical stack mobile, horizontal desktop]
  🔴 "Nie pamiętam" (0-2) - czerwony
  🟠 "Trudne" (3) - pomarańczowy
  🟢 "Dobre" (4) - zielony
  🔵 "Łatwe" (5) - niebieski
  
  Każdy button: główny text + subtext z wartością + icon
```

**Flow:**
1. `GET /api/flashcards/due?limit=20` przy starcie
2. Jeśli 0 kart → Empty state z opcjami
3. Wyświetl front → user klika "Pokaż" → back + rating
4. Po rating → `POST /api/flashcards/{id}/review` → next card
5. Po wszystkich → Success message + stats

**Fallback dla 0 Due Cards:**
- Success empty state: "🎉 Wszystkie fiszki przejrzane!"
- Pokazuje najbliższą datę powtórki
- Secondary button: "Przejrzyj wszystkie karty mimo to"

---

### 5. Historia Sesji (`/sessions`)

**Layout:**
```
[Table/Card List]
Columns:
  - Data
  - Input Preview (first 100 chars)
  - Generated / Accepted / Rejected counts
  - Status badge (success/failed/partial)
  - Actions (View details)

[Click na row → Inline expansion]
  - Full input text (scrollable)
  - Lista zaakceptowanych kart (read-only)
  - Metadata (model, generation time, tokens)
  - Link do każdej karty

[Pagination]
```

**API:**
- `GET /api/sessions?page=1&limit=20`
- `GET /api/sessions/{id}` dla details

---

### 6. Settings (`/settings`)

**Minimalne ustawienia MVP:**
```
[Profile Section]
  - Display name (inline edit)
  - Email (read-only)

[Preferences] (disabled w MVP)
  - Cards per session
  - Default sort order

[Account Section]
  - "Zmień hasło" button (Supabase reset email)
  - "Usuń konto" button (danger zone + confirmation + re-auth)

[About Section]
  - Wersja aplikacji
  - Privacy policy link
  - Terms of service link
```

---

## 🔧 Stack Technologiczny

### Core
- **Astro 5** - Framework, partial hydration
- **React 19** - Interactive components
- **TypeScript 5** - Type safety
- **Tailwind 4** - Styling (@theme directive)

### UI Components
- **shadcn/ui** - Component library (Button, Input, Dialog, Toast, etc.)
- **Radix UI** - Unstyled primitives
- **lucide-react** - Icons

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation (client + server)

### State Management
- **TanStack Query (React Query)** - Server state
  - Automatic caching, refetching
  - Optimistic updates
  - Error handling
  - `useQuery`, `useMutation`
- **React useState** - Local UI state

### Authentication
- **Supabase Auth** - JWT tokens
- **RLS** - Row Level Security w bazie

---

## 📁 Struktura Folderów

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── common/          # Navbar, Footer, ErrorBoundary
│   ├── auth/            # LoginForm, SignupForm
│   ├── dashboard/       # StatsCard, QuickActions
│   ├── flashcards/      # FlashcardCard, FlashcardList, FlashcardForm
│   ├── generation/      # GenerateWizard, StepIndicator, CardPreview
│   └── learning/        # StudyCard, QualityButtons, SessionProgress
├── layouts/
│   ├── Layout.astro
│   └── DashboardLayout.astro
├── pages/
│   ├── index.astro
│   ├── login.astro
│   ├── signup.astro
│   ├── dashboard.astro
│   ├── generate.astro
│   ├── flashcards.astro
│   ├── learn.astro
│   ├── sessions.astro
│   ├── settings.astro
│   └── api/             # API routes (już zaimplementowane)
├── lib/
│   ├── api/            # API client wrappers
│   ├── hooks/          # Custom hooks (useAuth, useFlashcards)
│   ├── schemas/        # Zod validation schemas
│   └── utils/          # Utility functions
├── middleware/
│   └── index.ts        # Auth middleware
└── styles/
    └── global.css      # Global styles, CSS variables
```

---

## 🎭 Wzorce Implementacji

### Loading States (kontekst-specyficzne)

1. **Initial page load** → Skeleton loaders (shadcn/ui Skeleton)
2. **Button actions** → Spinner w buttonie + disabled + "Zapisywanie..."
3. **AI generation** → Progress modal z linear bar
4. **Pagination/filters** → Subtle overlay nad tabelą
5. **Background refetch** → Subtle indicator w navbar

### Error Handling (wielopoziomowe)

1. **Global Error Boundary** (React)
   - Friendly error page
   - "Odśwież" + "Zgłoś problem" buttons
   - Console logging

2. **API Errors per context:**
   - 401/403 → Redirect do login
   - 404 → Empty state "Nie znaleziono"
   - 400 → Field-specific errors w formach
   - 429 → Alert banner z countdown
   - 500/503 → Toast z retry button

3. **Network errors:**
   - TanStack Query retry (3x exponential backoff)
   - Offline message

4. **Optimistic updates failures:**
   - Rollback + toast notification

**Error Messages:** Po polsku, user-friendly, nie raw API errors

### Empty States (actionable)

Struktura:
1. Icon/ilustracja (lucide-react)
2. Heading ("Nie masz jeszcze żadnych fiszek")
3. Description (benefit)
4. Primary CTA button (direct action)
5. Secondary link (alternative/help)

### Form Validation

- **React Hook Form** + **Zod schemas**
- Controlled components
- Client-side (immediate feedback) + Server-side (security)
- API errors mapowane na field errors
- shadcn/ui Form components

### Delete Patterns

- **Single delete:** Immediate + undo toast (5s)
- **Bulk delete:** Confirmation modal
- **Delete podczas edycji:** Confirmation modal
- TanStack Query rollback dla undo

---

## 🚀 Kluczowe User Flows

### Flow 1: Nowy użytkownik
1. Landing page `/` → "Rozpocznij za darmo"
2. Signup `/signup` → formularz → `POST /api/auth/signup`
3. Auto-login → redirect `/dashboard`
4. Empty dashboard → "Wygeneruj pierwsze fiszki" CTA
5. Generation wizard → 3 kroki → fiszki utworzone
6. Dashboard z stats → "Rozpocznij naukę"
7. Learning session

### Flow 2: Generowanie fiszek AI
1. Dashboard/navbar → "Generuj"
2. Step 1: Wklej tekst (1000-10000 chars) → walidacja → "Dalej"
3. Step 2: Progress modal → `POST /api/generate` → sukces
4. Step 3: Przegląd kart → edycja → select → "Zapisz wybrane"
5. `POST /api/generate/{sessionId}/accept`
6. Redirect `/flashcards` z toast "X fiszek dodanych"

### Flow 3: Sesja nauki
1. Dashboard → "Rozpocznij naukę" / `/learn`
2. `GET /api/flashcards/due?limit=20`
3. Fullscreen → karta 1/20 → pytanie
4. "Pokaż odpowiedź" → odpowiedź + rating buttons
5. Click rating → `POST /api/flashcards/{id}/review`
6. Automatycznie następna karta
7. Po 20 kartach → Summary + stats
8. "Exit" → back to dashboard

### Flow 4: Ręczne tworzenie fiszki
1. `/flashcards` → FAB "+" lub empty state CTA
2. Modal opens → form (front + back)
3. React Hook Form validation
4. "Utwórz fiszkę" → `POST /api/flashcards`
5. Modal closes → toast "Fiszka utworzona"
6. Lista refetches → nowa karta at top

---

## 🔐 Bezpieczeństwo i Autoryzacja

### Authentication Flow
- Supabase Auth JWT tokens
- Access token (1h expiry) + refresh token
- Automatic refresh przez Supabase SDK
- Authorization header: `Bearer {access_token}`

### Authorization (RLS)
- Database-level Row Level Security
- Automatic filtering przez `auth.uid()`
- Users widza tylko własne resources

### Input Validation
- Client: React Hook Form + Zod
- Server: Zod schemas + database constraints
- All inputs sanitized

### Rate Limiting
- Proaktywne wyświetlanie (dashboard badge)
- 2 generacje/dzień per user
- Disabled button gdy limit exceeded
- 429 error handling z user-friendly message

---

## ⚡ Performance & Optimization

### Caching Strategy (TanStack Query)
- User profile: 5 min staleTime
- Flashcard lists: 1 min staleTime
- Due cards: 0 staleTime (real-time)
- Refetch on window focus: enabled

### Tab Synchronization
- MVP: Independent tabs
- Refetch on tab focus
- Post-MVP: Supabase Realtime lub BroadcastChannel API

### Database Optimization
- Indexes na: `user_id`, `next_review_date`, `created_at`
- Pagination na wszystkich listach
- Full-text search na `generation_sessions.input_text` (future)

### Code Splitting
- Astro partial hydration
- React components loaded on demand
- Feature-based organization enables lazy loading

---

## 📊 Success Metrics Tracking

Dashboard stats (`/api/profile/stats`):
1. **AI Acceptance Rate:** (accepted / generated) × 100 → cel 75%
2. **AI Usage Rate:** (AI cards / total cards) × 100 → cel 75%
3. **Cards Due Today:** Motivational metric
4. **Total Reviews Completed:** Progress indicator

---

## 🎯 MVP Scope - Out of Scope

**NIE implementowane w MVP:**
- Dark mode toggle
- Real-time notifications
- Offline-first / Service Workers
- Rich text formatting (markdown)
- Mobile apps (tylko web)
- Analytics dashboard / trends / wykresy
- Collaborative features / shared decks
- Import/export (PDF, DOCX, CSV)
- Advanced search (full-text)
- Gamification (streaks, achievements)
- Public API
- Multi-language support (PL only)

**Post-MVP considerations:**
- Dark mode przez CSS variables toggle
- Supabase Realtime dla live updates
- PWA z Service Workers
- Markdown editor (TipTap)
- Analytics page z charts
- Export to Anki format

---

## ✅ Implementation Checklist

### Setup
- [ ] Initialize Astro 5 project
- [ ] Install dependencies (React 19, TailwindCSS 4, shadcn/ui)
- [ ] Configure TypeScript
- [ ] Setup Supabase client
- [ ] Configure Astro middleware

### Design System
- [ ] Setup CSS variables (colors, spacing)
- [ ] Configure shadcn/ui theme
- [ ] Create global styles
- [ ] Setup lucide-react icons

### Layouts & Navigation
- [ ] Create base Layout.astro
- [ ] Build Navbar component
- [ ] Build Footer component
- [ ] Implement user menu dropdown
- [ ] Mobile hamburger menu

### Authentication
- [ ] Landing page (/)
- [ ] Login page (/login)
- [ ] Signup page (/signup)
- [ ] Auth forms z React Hook Form + Zod
- [ ] Middleware protection
- [ ] Auto-redirect logic

### Dashboard
- [ ] Dashboard layout
- [ ] Stats cards component
- [ ] Quick actions component
- [ ] Recent activity list
- [ ] Empty state
- [ ] Rate limit badge
- [ ] Skeleton loaders

### Generation Wizard
- [ ] Wizard layout (3 steps)
- [ ] Step indicator component
- [ ] Step 1: Textarea + validation + draft save
- [ ] Step 2: Progress modal
- [ ] Step 3: Card preview list + inline editing
- [ ] Navigation buttons (Dalej, Wstecz)
- [ ] API integration

### Flashcards List
- [ ] List layout z filters i sort
- [ ] Table/Card components
- [ ] Inline editing mode
- [ ] Delete z undo toast
- [ ] Create modal (FAB + form)
- [ ] Pagination component
- [ ] Empty state
- [ ] Skeleton loaders

### Learning Session
- [ ] Fullscreen layout
- [ ] Exit button
- [ ] Progress bar
- [ ] Card display (front/back)
- [ ] Quality rating buttons
- [ ] Session flow logic
- [ ] Empty state (0 due cards)
- [ ] Success summary

### Sessions History
- [ ] List layout
- [ ] Table z expandable rows
- [ ] Detail view (inline lub modal)
- [ ] Empty state
- [ ] Pagination

### Settings
- [ ] Settings page layout
- [ ] Profile section
- [ ] Account section (change password, delete)
- [ ] About section

### Shared Components
- [ ] Error Boundary
- [ ] Toast system (shadcn/ui)
- [ ] Loading states (skeletons, spinners)
- [ ] Empty state component
- [ ] Confirmation modals

### State Management
- [ ] Setup TanStack Query client
- [ ] Custom hooks (useAuth, useFlashcards, etc.)
- [ ] API client wrappers
- [ ] Zod schemas (shared)

### Error Handling
- [ ] Global error boundary
- [ ] API error interceptors
- [ ] Error mapping (status codes)
- [ ] User-friendly Polish messages
- [ ] Retry logic

### Testing & Polish
- [ ] Cross-browser testing
- [ ] Responsive testing (mobile, tablet, desktop)
- [ ] Accessibility audit (WCAG AA)
- [ ] Performance optimization
- [ ] Error scenarios testing
- [ ] User flow walkthroughs

---

## 📝 Decyzje Projektowe - Uzasadnienia

### 1. Dashboard jako główny widok
**Dlaczego:** Pozwala na szybką ocenę postępów i wybór kolejnej akcji. Stats z `/api/profile/stats` pokazują kluczowe metryki sukcesu (75% acceptance rate).

### 2. Wieloetapowy wizard generowania
**Dlaczego:** Jasny user flow zgodny z US-003 i US-004. Linear progression guide użytkownika przez proces.

### 3. Filtry i sortowanie w liście fiszek
**Dlaczego:** Query parameters API wspierają te funkcje. URL sync umożliwia bookmarkowanie. shadcn/ui components idealnie pasują.

### 4. Tradycyjny widok w sesji nauki
**Dlaczego:** Focused experience z przyciskami rating zamiast flip animations. Prostsze i bardziej accessible.

### 5. Brak offline-first w MVP
**Dlaczego:** Znacząco zwiększyłoby complexity (sync conflicts, queue management). Astro + Supabase zapewniają dobrą wydajność online.

### 6. Proaktywny rate limiting display
**Dlaczego:** Zapobiega frustracji. Badge pokazuje stan limitów przed wywołaniem API. Disabled button z tooltip gdy limit exceeded.

### 7. Plain text bez rich formatting
**Dlaczego:** Upraszcza walidację i MVP scope. Markdown editor zwiększyłby complexity znacząco.

### 8. Top navbar z ukrywaniem w learning mode
**Dlaczego:** Persistent navigation vs. focus mode w nauce. Intuicyjne, działa na mobile (hamburger), shadcn/ui NavigationMenu.

### 9. Split approach dla landing page
**Dlaczego:** Clear onboarding dla nowych użytkowników, szybki dostęp dla powracających. Middleware auto-redirects.

### 10. React Hook Form + Zod
**Dlaczego:** Deklaratywna walidacja, sync z API, automatic error handling, seamless integration z shadcn/ui.

### 11. Kontekst-specyficzne loading states
**Dlaczego:** Skeletons dla initial load (faster perception), spinners w buttons (clear action feedback), progress dla AI (informuje o czasie).

### 12. Wielopoziomowe error handling
**Dlaczego:** Global boundary dla unexpected, context-specific dla API errors, Polish user-friendly messages, retry logic.

### 13. Feature-based organization
**Dlaczego:** Scalable, ułatwia code splitting, jasno separuje concerns, zgodne z Astro best practices.

### 14. Context-dependent editing
**Dlaczego:** Inline w liście (quick fixes), modal w session (focus preservation), minimalizuje context switching.

### 15. Actionable empty states
**Dlaczego:** Redukuje confusion, guiduje do next action, icon + heading + description + CTA = complete pattern.

### 16. Current stats bez trendsów w MVP
**Dlaczego:** MVP simplicity, focus na core actions, trends można dodać post-MVP jako dedicated Analytics view.

### 17. Linear wizard z controlled progression
**Dlaczego:** Clear UX, reduces complexity, guiduje przez proces, localStorage backup zapobiega utracie tekstu.

### 18. Light mode only w MVP
**Dlaczego:** Reduces complexity, CSS variables gotowe na dark mode post-MVP, focus na core features.

### 19. Inteligentny fallback dla 0 due cards
**Dlaczego:** Success message gdy done, opcja review all dla advanced users, onboarding gdy 0 cards total.

### 20. Minimal settings page
**Dlaczego:** MVP scope, tylko essential (profile, password, delete account), future-ready structure.

### 21. Context-specific truncation
**Dlaczego:** Overview w listach (truncation), complete info w review (no truncation), balance readability vs overview.

### 22. Wszystkie karty bez pagination w wizard step 3
**Dlaczego:** AI generuje max 5-10 kart, user musi przejrzeć wszystkie, pagination adds friction, single scroll fastest.

### 23. Progressive confirmation dla delete
**Dlaczego:** Single delete z undo (fastest), modal dla bulk/editing (consequences większe), prevents accidental deletion.

### 24. Expandable detail view w sessions
**Dlaczego:** Inline expansion szybsze niż dedicated page, less navigation overhead, audit trail dla learning.

### 25. Independent tabs w MVP
**Dlaczego:** Simplicity, refetch-on-focus sufficient, cross-tab sync przez Realtime post-MVP.

### 26. Modal dla tworzenia fiszki
**Dlaczego:** Less navigation vs dedicated page, cleaner UI vs inline, FAB thumb-friendly na mobile, consistent pattern.

### 27. Hybrid semantic + numeric rating
**Dlaczego:** 4 intuitive choices vs 6 numeric, color coding, large touch targets, user-friendly dla non-technical.

---

## 🎉 Podsumowanie

Architektura UI dla 10xCards MVP jest **kompletna i gotowa do implementacji**. 

**Kluczowe zalety:**
- ✅ Spójność z PRD, API Plan, i tech stack
- ✅ Zbalansowana między funkcjonalnością a prostotą MVP
- ✅ Jasna ścieżka do rozbudowy post-MVP
- ✅ Focus na user experience i accessibility
- ✅ Modern tech stack (Astro 5, React 19, shadcn/ui)
- ✅ Comprehensive error handling i loading states
- ✅ Feature-based organization dla skalowalności

**Następne kroki:**
1. Review tego dokumentu z zespołem
2. Rozpoczęcie implementacji według checklisty
3. Iteracyjne delivery (setup → auth → dashboard → generation → etc.)
4. Continuous testing i user feedback

---

**Dokument zatwierdzony do implementacji.**  
**Wersja:** 1.0 | **Data:** 2025-10-26

