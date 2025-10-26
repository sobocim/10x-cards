# Podsumowanie Planowania Architektury UI dla 10xCards MVP

**Data:** 2025-10-26  
**Status:** Zatwierdzony do implementacji  
**Wersja dokumentu źródłowego:** 1.0

---

## <conversation_summary>

### <decisions>

#### Decyzje Podjęte w Planowaniu Architektury UI:

1. **Struktura Routingu**: Podział na public routes (`/`, `/login`, `/signup`) i protected routes (`/dashboard`, `/generate`, `/flashcards`, `/learn`, `/sessions`, `/settings`) z automatyczną walidacją przez Astro middleware i auto-redirect dla niezalogowanych użytkowników

2. **Dashboard jako Central Hub**: Wybór dashboardu jako głównego widoku po zalogowaniu z widocznymi metrykami sukcesu (Cards Due Today, Total Cards, AI %, Acceptance Rate), quick actions i recent activity

3. **Linearny 3-Krokowy Generation Wizard**: 
   - Step 1: Wklejanie tekstu (1000-10000 znaków) z walidacją i auto-save
   - Step 2: Progress modal z AI generowaniem
   - Step 3: Przegląd wszystkich kart z inline editing i selekcją

4. **Fullscreen Learning Experience**: Sesja nauki w trybie fullscreen z ukrytym navbarem, floating Exit button i focused card display dla maksymalnej koncentracji

5. **Hybrid Semantic Rating System**: 4-poziomowy system oceny (Nie pamiętam/Trudne/Dobre/Łatwe) zamiast 6 numerycznych poziomów, z color coding i intuicyjnymi opisami

6. **Light Mode Only w MVP**: Rezygnacja z dark mode toggle w pierwszej wersji dla uproszczenia scope, z przygotowaniem CSS variables na przyszłość

7. **Plain Text Content Format**: Brak rich text formatting (Markdown, WYSIWYG) w MVP - tylko plain text dla uproszczenia walidacji i edycji

8. **Inline Editing Pattern**: Edycja in-place w liście fiszek zamiast dedykowanych stron edycji dla szybszych poprawek

9. **Modal-Based Create Flow**: FAB (Floating Action Button) + modal dla tworzenia nowych fiszek zamiast dedykowanej strony

10. **Expandable Detail View**: Inline expansion dla szczegółów sesji w history zamiast osobnych podstron dla redukcji navigation overhead

11. **Smart Delete Pattern**: Single delete z 5-sekundowym undo toast, confirmation modal tylko dla bulk operations i delete podczas edycji

12. **Proactive Rate Limiting Display**: Badge pokazujący pozostałe generacje dzisiaj (X/2) na dashboardzie zamiast dopiero error message przy przekroczeniu

13. **Independent Tab Behavior**: Brak synchronizacji między kartami w MVP, refetch-on-focus wystarczający, cross-tab sync przez Supabase Realtime jako post-MVP

14. **Minimal Settings Approach**: Tylko essentials w MVP: profile info (display name, email), change password, delete account - bez advanced preferences

15. **No Pagination w Generation Review**: Wszystkie wygenerowane karty (5-10 max) widoczne jednocześnie w step 3 dla szybkiego przeglądu

16. **Context-Specific Loading States**: Różne strategie dla różnych kontekstów - skeleton loaders dla initial load, spinners w buttonach, progress modal dla AI, subtle overlay dla pagination

17. **Multi-Level Error Handling**: Global Error Boundary + context-specific API error handling + Polish user-friendly messages + retry logic

18. **Feature-Based Code Organization**: Organizacja komponentów według features (auth, dashboard, flashcards, generation, learning) zamiast typu (containers, components)

19. **TanStack Query jako Server State Manager**: Wybór React Query dla caching, automatic refetching, optimistic updates i error handling

20. **React Hook Form + Zod dla Validacji**: Deklaratywna walidacja z sync między client i server, automatic error handling, seamless integration z shadcn/ui

21. **Persistent Top Navigation**: Top navbar persistent na wszystkich stronach z wyjątkiem learning mode dla balance między navigation convenience i focus mode

22. **Actionable Empty States**: Każdy empty state z clear structure: icon + heading + description + primary CTA + secondary link

23. **URL Sync dla Filters**: Query parameters dla filters i sort w liście fiszek dla możliwości bookmarkowania i sharing

24. **Auto-Save Draft Management**: Auto-save co 2 sekundy w generation wizard z "restore draft" option (< 24h) dla zapobiegania utracie danych

25. **Mobile-First Responsive Design**: Hamburger menu na mobile, responsive typography scale, touch-friendly targets (min 44x44px)

### </decisions>

### <matched_recommendations>

#### Kluczowe Zalecenia Architektury Zastosowane w Projekcie:

1. **Modern Tech Stack Selection**:
   - Astro 5 jako framework główny z partial hydration dla performance
   - React 19 tylko dla interaktywnych komponentów
   - TypeScript 5 dla type safety
   - Tailwind 4 z @theme directive dla styling
   - shadcn/ui + Radix UI jako component library
   - lucide-react dla icon system

2. **Comprehensive State Management Strategy**:
   - TanStack Query (React Query) dla server state
   - Automatic caching z configurable staleTime (0-5 min depending on data type)
   - Optimistic updates z automatic rollback
   - React useState dla local UI state
   - localStorage dla draft persistence

3. **Feature-Based Directory Structure**:
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
   ├── lib/
   │   ├── api/            # API client wrappers
   │   ├── hooks/          # Custom hooks (useAuth, useFlashcards)
   │   ├── schemas/        # Zod validation schemas
   │   └── utils/          # Utility functions
   ```

4. **Context-Specific Loading States Pattern**:
   - **Initial page load**: Skeleton loaders (shadcn/ui Skeleton component)
   - **Button actions**: Spinner w buttonie + disabled state + text "Zapisywanie..."
   - **AI generation**: Progress modal z linear progress bar (0-100%) + estimated time
   - **Pagination/filters**: Subtle overlay nad content area
   - **Background refetch**: Subtle indicator w navbar

5. **Multi-Level Error Handling Architecture**:
   - **Global Error Boundary** (React): Friendly error page z "Odśwież" i "Zgłoś problem" buttons
   - **API Errors per context**:
     - 401/403 → Automatic redirect do login
     - 404 → Empty state "Nie znaleziono"
     - 400 → Field-specific errors w formach
     - 429 → Alert banner z countdown do reset
     - 500/503 → Toast z retry button
   - **Network errors**: TanStack Query retry (3x exponential backoff) + offline message
   - **Optimistic updates failures**: Automatic rollback + toast notification
   - **Error Messages**: Po polsku, user-friendly, nie raw API errors

6. **Actionable Empty States Pattern**:
   - Consistent structure: Icon (lucide-react) + Heading + Description (benefit) + Primary CTA + Secondary link
   - Context-specific content i CTAs
   - Różne scenariusze: first-time user, filtered results, completed tasks

7. **Form Validation Strategy**:
   - React Hook Form dla form state management
   - Zod schemas dla validation (shared client + server)
   - Controlled components
   - Client-side dla immediate feedback + Server-side dla security
   - API errors mapowane na field errors
   - shadcn/ui Form components dla consistent UI

8. **Progressive Delete Patterns**:
   - **Single delete**: Immediate + undo toast (5s timeout) z TanStack Query rollback
   - **Bulk delete**: Confirmation modal z count
   - **Delete podczas edycji**: Confirmation modal z warning
   - Color coding (destructive red) i clear labels

9. **Authentication & Authorization Flow**:
   - Supabase Auth JWT tokens (access token 1h + refresh token)
   - Automatic refresh przez Supabase SDK
   - Authorization header: `Bearer {access_token}`
   - Database-level Row Level Security (RLS)
   - Automatic filtering przez `auth.uid()`
   - Astro middleware dla route protection

10. **Caching & Performance Strategy**:
    - **User profile**: 5 min staleTime (rarely changes)
    - **Flashcard lists**: 1 min staleTime (moderate changes)
    - **Due cards**: 0 staleTime (real-time accuracy needed)
    - **Refetch on window focus**: Enabled
    - **Database indexes**: `user_id`, `next_review_date`, `created_at`
    - **Pagination**: Na wszystkich listach (20/50/100 items per page)

11. **Responsive & Accessible Design**:
    - Mobile-first approach
    - WCAG AA compliance (4.5:1 contrast ratio)
    - Responsive typography scale
    - Consistent 4px base unit spacing
    - Touch-friendly targets (min 44x44px)
    - Hamburger menu na mobile
    - Semantic HTML + ARIA labels

12. **Draft Management System**:
    - Auto-save co 2 sekundy z timestamp do localStorage
    - "Draft saved" indicator dla user feedback
    - "Restore draft" option przy ponownym wejściu (< 24h)
    - Clear draft po successful submission

13. **URL State Synchronization**:
    - Filters i sort jako query parameters
    - Możliwość bookmarkowania filtered views
    - Browser back/forward support
    - Sharing capability

14. **Optimistic Updates Implementation**:
    - TanStack Query mutations z optimistic flag
    - Immediate UI update pre API response
    - Automatic rollback on error
    - Toast notification dla errors
    - Retry logic

15. **Security & Input Validation**:
    - Client: React Hook Form + Zod dla immediate feedback
    - Server: Zod schemas + database constraints
    - All inputs sanitized
    - CSRF protection (Supabase handles)
    - XSS prevention (React escaping)
    - SQL injection prevention (Supabase parameterized queries)

16. **Rate Limiting Handling**:
    - Proaktywne wyświetlanie na dashboard (badge "X/2 remaining today")
    - Disabled button z tooltip gdy limit exceeded
    - 429 error handling z user-friendly message
    - Countdown do reset (midnight)
    - No aggressive retry na 429

17. **Code Splitting & Lazy Loading**:
    - Astro partial hydration (client:load, client:visible, client:idle)
    - React components loaded on demand
    - Feature-based organization enables lazy loading
    - Route-based code splitting

18. **Success Metrics Tracking**:
    - **AI Acceptance Rate**: (accepted / generated) × 100 → target 75%
    - **AI Usage Rate**: (AI cards / total cards) × 100 → target 75%
    - **Cards Due Today**: Motivational metric
    - **Total Reviews Completed**: Progress indicator
    - Dashboard display z `/api/profile/stats`

19. **Navigation Architecture**:
    - Persistent top navbar (hidden tylko w `/learn`)
    - Left: Logo + "10xCards" → link do dashboard
    - Center: Dashboard | Generuj | Moje Fiszki | Historia Sesji
    - Right: User menu dropdown (profile, settings, logout)
    - Mobile: Hamburger menu (collapsed)
    - Learning mode: Floating "Exit" button

20. **Context-Dependent Truncation**:
    - **Lists/Overview**: 150 chars truncation dla readability
    - **Review/Detail**: Full content, scrollable jeśli długi
    - **Hover tooltips**: Full text on truncated items

### </matched_recommendations>

### <ui_architecture_planning_summary>

## Szczegółowe Podsumowanie Architektury UI

### A. Główne Wymagania Dotyczące Architektury UI

#### Fundamentalne Założenia:
- **Approach**: Single Page Application z Astro SSG/SSR i partial hydration
- **Hydration Strategy**: Tylko interactive components w React (formularze, modals, dynamic lists)
- **Navigation**: Persistent top navbar z wyjątkiem fullscreen learning mode
- **Responsiveness**: Mobile-first design z breakpoints dla tablet i desktop
- **Accessibility**: WCAG AA compliance (minimum 4.5:1 contrast ratio)
- **Localization**: Polish language interface (MVP), structure ready dla i18n
- **Authentication**: JWT-based z automatic session management przez Supabase
- **Performance**: Target Lighthouse score > 90, First Contentful Paint < 1.5s

#### User Experience Principles:
1. **Minimize Navigation Friction**: Modals preferowane nad separate pages gdzie sensowne
2. **Immediate Feedback**: Optimistic updates, comprehensive loading states, instant validation
3. **Error Prevention**: Proactive rate limit display, client-side validation, clear constraints
4. **Context Preservation**: localStorage drafts, URL sync dla filters, session continuity
5. **Focus Mode**: Distraction-free learning environment (fullscreen, hidden nav)
6. **Progressive Disclosure**: Show essential info first, expand on demand

---

### B. Kluczowe Widoki, Ekrany i Przepływy Użytkownika

#### 1. Public Flow (Onboarding)

**Landing Page (`/`)**
- **Layout**: Hero section z value proposition, CTA buttons ("Rozpocznij za darmo", "Zaloguj się")
- **Content**: Clear explanation czym jest 10xCards, benefits AI-powered flashcards
- **Middleware**: Auto-redirect zalogowanych users do `/dashboard`

**Signup Page (`/signup`)**
- **Form**: Email, password, confirm password
- **Validation**: React Hook Form + Zod (email format, password strength min 8 chars)
- **API**: `POST /api/auth/signup`
- **Flow**: Success → auto-login → redirect `/dashboard`
- **Error Handling**: Field-specific errors, duplicate email detection

**Login Page (`/login`)**
- **Form**: Email, password, "Forgot password?" link
- **Validation**: React Hook Form + Zod
- **API**: `POST /api/auth/login`
- **Flow**: Success → redirect `/dashboard` (lub returnUrl z query params)
- **Error Handling**: Invalid credentials message (generic dla security)

#### 2. Dashboard (`/dashboard`)

**Purpose**: Centralny hub pokazujący overview i umożliwiający quick actions

**Layout Structure**:
```
[Navbar]
[Hero Section]
  - Greeting: "Witaj, {displayName}!"
  - Subheading z motivational message
  
[Stats Cards Grid - 4 karty w row na desktop, 2x2 na tablet, stack na mobile]
  1. Cards Due Today (z highlighted CTA "Rozpocznij naukę")
  2. Total Cards Created (lifetime count)
  3. AI Generated (percentage z total)
  4. Average Acceptance Rate (target indicator)
  
[Rate Limit Badge]
  - "Pozostałe generacje dzisiaj: X/2"
  - Color: Green (2), Yellow (1), Red (0)
  - Tooltip z explanation i reset time
  
[Quick Actions - 3 duże buttony w row/stack]
  1. "Generuj nowe fiszki" (Primary, gradient) → `/generate`
  2. "Rozpocznij naukę" (Success, green) → `/learn`
  3. "Przeglądaj fiszki" (Secondary, neutral) → `/flashcards`
  
[Recent Activity - ostatnie 5 sesji]
  - Table/list z: Date, Input preview (50 chars), Generated/Accepted counts, Status
  - Link: "Zobacz całą historię" → `/sessions`
```

**Data Sources**:
- `GET /api/profile/stats` → Stats cards data
- `GET /api/sessions?limit=5` → Recent activity

**Loading States**:
- Skeleton loaders dla stats cards (shimmer effect)
- Skeleton rows dla recent activity

**Empty States** (first-time user):
- Hero: "Witaj w 10xCards!"
- Description: "Zacznij od wygenerowania pierwszych fiszek AI"
- Primary CTA: "Generuj fiszki" → `/generate`
- Secondary link: "Lub utwórz fiszkę ręcznie" → opens create modal

**Success Metrics Display**:
- Acceptance rate z color indicator: Green (>75%), Yellow (50-75%), Red (<50%)
- AI usage rate z target progress bar

#### 3. Generation Wizard (`/generate`)

**Purpose**: 3-krokowy guided process generowania fiszek AI

**Overall Layout**:
```
[Step Indicator na górze]
  ○ 1. Tekst → ○ 2. Generowanie → ○ 3. Przegląd
  (active step highlighted, completed steps z checkmark)
```

**Step 1: Wklejanie Tekstu**
```
[Main Content Area]
  [Instructions]
    - "Wklej tekst (1000-10000 znaków)"
    - "AI wygeneruje fiszki z kluczowych informacji"
    
  [Textarea - large, autoresize]
    - Placeholder z example
    - Live character counter: "X / 10000 znaków" (color changes near limits)
    - Client-side validation (min/max)
    
  [Draft Indicator]
    - "Szkic zapisany o {timestamp}" (subtle, auto-fade)
    - Auto-save co 2s do localStorage
    
  [Restore Draft Banner] (if draft exists < 24h)
    - "Znaleziono zapisany szkic z {date}"
    - Buttons: "Przywróć" | "Odrzuć"
    
  [Navigation]
    - Button: "Dalej" (disabled dopóki validation nie OK)
    - Link: "Anuluj" → back to dashboard z confirmation jeśli text entered
```

**Draft Management Logic**:
- Auto-save trigger: debounced 2s po ostatniej zmianie
- Storage key: `generation_draft_{userId}`
- Data: `{ text: string, timestamp: number }`
- Clear draft: Po successful submission lub explicit discard

**Step 2: Generowanie**
```
[Full-Screen Progress Modal - non-dismissable]
  [Icon] - AI/sparkles animation
  [Heading] - "Generowanie fiszek..."
  [Progress Bar] - Linear, 0-100% (animated)
  [Estimated Time] - "Około 30 sekund"
  [Status Text] - Dynamic updates if available
  [Cancel Button] - Secondary, "Anuluj generowanie"
    - Returns to Step 1 z zachowanym tekstem
```

**API Call**:
- `POST /api/generate` z `{ inputText: string }`
- Response: `{ sessionId, flashcards: [...], status }`
- Error handling: Modal z error message + "Spróbuj ponownie" button

**Step 3: Przegląd i Edycja**
```
[Header Summary]
  - "Wygenerowano X fiszek"
  - "Zaznacz które chcesz zapisać"
  
[Vertical Stack Kart - wszystkie widoczne, no pagination]
  Każda karta:
    [Checkbox] - Checked by default
    [Card Container]
      [Front Field]
        - Label: "Pytanie"
        - Inline textarea (auto-resize, max 500 chars)
        - Character counter
      [Back Field]
        - Label: "Odpowiedź"
        - Inline textarea (auto-resize, max 1000 chars)
        - Character counter
      [Delete Icon Button] - Top-right corner
        - Confirmation: "Czy na pewno usunąć?" (inline lub modal)
    
[Sticky Bottom Bar]
  [Selection Summary]
    - "Zaakceptowane: X/Y fiszek"
  [Actions]
    - Button: "Zapisz wybrane" (Primary, disabled jeśli 0 selected)
    - Button: "Odrzuć wszystkie" (Destructive, confirmation modal)
    - Button: "Wstecz" (Secondary, warning modal o utracie zmian)
```

**Validation**:
- React Hook Form dla każdej karty (array field)
- Zod schema: min lengths, max lengths, no empty strings
- Real-time validation z inline errors
- Server-side validation przed final save

**API Call**:
- `POST /api/generate/{sessionId}/accept` z `{ flashcardIds: [...], edits: {...} }`
- Success: Toast "X fiszek dodanych", redirect `/flashcards`
- Error: Toast z retry option, user stays na step 3

**No Pagination Rationale**: AI generuje max 5-10 kart, wszystkie muszą być przejrzane, pagination adds unnecessary friction

#### 4. Moje Fiszki (`/flashcards`)

**Purpose**: Browse, filter, sort, edit i manage wszystkie user flashcards

**Layout**:
```
[Header Bar]
  [Left]
    - Heading: "Moje Fiszki"
    - Count badge: "X fiszek"
  [Right]
    - Button: "Dodaj fiszkę" (Primary, opens modal)
    
[Filter & Sort Bar]
  [Filter Dropdown]
    - Options: Wszystkie | AI Generated | Manual
    - Active filter highlighted
    - Sync z URL query param `?source=ai`
  [Sort Dropdown]
    - Options: Data utworzenia (newest first) | Następna powtórka (soonest first)
    - Sync z URL query param `?sort=created_at:desc`
  [Search Box] (post-MVP)
    - Placeholder: "Szukaj w fiszkach..."
    
[Table/Card List - responsive]
  Desktop: Table view
  Mobile: Card stack
  
  Columns/Fields:
    - Front (truncated 150 chars, expandable on hover)
    - Back (truncated 150 chars, expandable on hover)
    - Source badge (AI icon | Manual icon, color-coded)
    - Next review date (formatted, relative time dla <7 days)
    - Actions dropdown: Edit | Delete
    
  Interactions:
    - Click na row → Inline edit mode (transform fields do textareas)
    - Edit mode: Save | Cancel buttons appear
    - Delete → Immediate + undo toast (5s timeout)
    
[Pagination]
  - Page numbers (1 2 3 ... 10)
  - Items per page selector: 20 | 50 | 100
  - Total count display
  - Sync z URL query param `?page=2&limit=20`
```

**Create Modal** (opened z FAB lub header button):
```
[Modal - centered, max-width 600px]
  [Header] - "Utwórz nową fiszkę"
  [Form]
    [Front Field]
      - Label: "Pytanie"
      - Textarea (auto-resize, max 500 chars)
      - Character counter
    [Back Field]
      - Label: "Odpowiedź"
      - Textarea (auto-resize, max 1000 chars)
      - Character counter
  [Footer]
    - Button: "Utwórz fiszkę" (Primary)
    - Button: "Anuluj" (Secondary)
```

**API Calls**:
- `GET /api/flashcards?page=1&limit=20&source=ai&sort=created_at:desc` → List
- `POST /api/flashcards` → Create
- `PUT /api/flashcards/{id}` → Update (inline edit)
- `DELETE /api/flashcards/{id}` → Delete (z możliwością undo)

**Empty State**:
- Icon: Empty box/cards illustration
- Heading: "Nie masz jeszcze żadnych fiszek"
- Description: "Rozpocznij naukę generując fiszki AI lub tworząc je ręcznie"
- Primary CTA: "Wygeneruj fiszki" → `/generate`
- Secondary CTA: "Utwórz fiszkę" → opens create modal

**Loading States**:
- Initial load: Skeleton table rows (5-10 rows)
- Pagination/filter: Subtle overlay nad table z spinner
- Inline edit save: Spinner w Save button + disabled state

**Error Handling**:
- Network error: Toast z retry button
- Validation error: Inline field errors
- Delete undo: TanStack Query rollback + refetch

#### 5. Sesja Nauki (`/learn`)

**Purpose**: Distraction-free spaced repetition learning session

**Fullscreen Mode Layout**:
```
[Floating Exit Button - top-right corner]
  - Icon: X lub Exit icon
  - Confirmation modal jeśli mid-session
  
[Progress Bar - top, full width]
  - "X / Y kart" (centered text)
  - Linear progress fill
  - Color gradient (cool → warm as progress)
  
[Main Content Area - vertically centered]
  
  FRONT VIEW (initial state):
    [Card Container - centered, max-width 800px]
      [Question Text]
        - Large font (2rem on desktop)
        - Scrollable jeśli długi
        - Subtle shadow/border
      [Show Answer Button]
        - Primary, large, centered
        - Keyboard shortcut: Space
  
  BACK VIEW (po "Pokaż odpowiedź"):
    [Card Container]
      [Question Text]
        - Smaller font (1.25rem)
        - At top dla context
        - Subtle divider line
      [Answer Text]
        - Large font (1.75rem)
        - Scrollable jeśli długi
        - Highlighted background
      
      [Quality Rating Buttons]
        Desktop: Horizontal row, large buttons
        Mobile: Vertical stack, full-width buttons
        
        Każdy button:
          - Icon + Main label + Sublabel (SM-2 value)
          - Color-coded
          - Keyboard shortcuts (1-4)
        
        Buttons:
          1. 🔴 "Nie pamiętam" (0-2) - bg-red-500
             Sublabel: "Powtórka za kilka minut"
          2. 🟠 "Trudne" (3) - bg-orange-500
             Sublabel: "Powtórka niedługo"
          3. 🟢 "Dobre" (4) - bg-green-500
             Sublabel: "Dobry interwał"
          4. 🔵 "Łatwe" (5) - bg-blue-500
             Sublabel: "Długi interwał"
```

**Session Flow**:
1. **Start**: `GET /api/flashcards/due?limit=20` przy wejściu
2. **Check**: Jeśli 0 kart → Empty state
3. **Display**: Show front view pierwszej karty
4. **Reveal**: User klika "Pokaż odpowiedź" (lub Space)
5. **Rate**: User wybiera quality rating (1-4 lub keyboard)
6. **Submit**: `POST /api/flashcards/{id}/review` z `{ quality: number }`
7. **Next**: Automatic transition do next card (smooth fade)
8. **Complete**: Po ostatniej karcie → Success screen

**Success Screen** (po przejrzeniu wszystkich):
```
[Completion Icon] - 🎉 celebration
[Heading] - "Świetna robota!"
[Stats Summary]
  - "Przejrzałeś X fiszek"
  - Breakdown: Y nie pamiętam, Z trudne, W dobre, V łatwe
  - Session time: "MM:SS"
[Actions]
  - Button: "Wróć do Dashboard" (Primary)
  - Button: "Przejrzyj więcej" (Secondary, jeśli available)
```

**Empty State (0 Due Cards)**:
- **Success variant**: "🎉 Wszystkie fiszki przejrzane!"
  - Description: "Następna powtórka: {nearest_review_date}"
  - Primary CTA: "Wróć do Dashboard"
  - Secondary CTA: "Przejrzyj wszystkie mimo to" (ignores due date)
- **Onboarding variant**: "Nie masz jeszcze fiszek do nauki"
  - Description: "Wygeneruj pierwsze fiszki, aby rozpocząć"
  - Primary CTA: "Generuj fiszki" → `/generate`

**Keyboard Shortcuts**:
- Space: Show answer / Continue (na success screen)
- 1-4: Quality ratings (na back view)
- Esc: Exit (z confirmation)

**API Calls**:
- `GET /api/flashcards/due?limit=20` → Fetch due cards
- `POST /api/flashcards/{id}/review` → Submit review z quality

**Loading States**:
- Initial load: Spinner z "Ładowanie fiszek..."
- Between cards: Subtle fade transition (no spinner)
- API submission: Brief loading indicator podczas save

**Error Handling**:
- Network error podczas review: Toast + auto-retry (3x)
- Fallback: Save review locally, sync when connection restored (post-MVP)

#### 6. Historia Sesji (`/sessions`)

**Purpose**: Audit trail wszystkich generation sessions

**Layout**:
```
[Header]
  - Heading: "Historia Generowania"
  - Subheading: "Przegląd wszystkich sesji AI"
  
[Table/Card List]
  Columns:
    - Data (DD MMM YYYY, HH:MM)
    - Input Preview (first 100 chars z "... więcej")
    - Generated / Accepted / Rejected (badges z counts)
    - Status (Success/Failed/Partial - color-coded)
    - Actions (Expand icon)
  
  Click na row → Expandable detail section:
    [Expanded View]
      [Section: Input Text]
        - Full text (scrollable, max-height 300px)
        - Copy button
      [Section: Accepted Cards]
        - List kart (front + back, read-only)
        - Link do każdej karty → `/flashcards` z highlight
      [Section: Metadata]
        - Model used
        - Generation time (seconds)
        - Tokens used (jeśli available)
        - Timestamp
      [Section: Rejected Cards] (if any)
        - Count + brief preview
        
[Pagination]
  - Standard pagination component
  - 20 items per page
```

**API Calls**:
- `GET /api/sessions?page=1&limit=20` → List sessions
- `GET /api/sessions/{id}` → Detail (loaded on expand)

**Empty State**:
- Icon: Document/history illustration
- Heading: "Brak historii generowania"
- Description: "Twoje sesje generowania AI pojawią się tutaj"
- Primary CTA: "Generuj pierwsze fiszki" → `/generate`

**Loading States**:
- Initial load: Skeleton table rows
- Expand row: Skeleton content dla detail section

#### 7. Settings (`/settings`)

**Purpose**: Minimal user preferences i account management

**Layout**:
```
[Sections - vertical stack, separated]

[Profile Section]
  Heading: "Profil"
  Fields:
    - Display Name (inline edit, click to activate)
      - Save/Cancel buttons appear
    - Email (read-only, subtle text)
      - Note: "Skontaktuj się aby zmienić email"
      
[Preferences Section] (disabled/greyed in MVP)
  Heading: "Preferencje" [MVP Badge]
  Fields:
    - Cards per session (disabled dropdown)
    - Default sort order (disabled dropdown)
  Note: "Dostępne w przyszłej wersji"
  
[Account Section]
  Heading: "Konto"
  Actions:
    - Button: "Zmień hasło" (Secondary)
      - Opens modal z instruction/link do Supabase password reset
    - Button: "Usuń konto" (Destructive)
      - Danger zone styling (red border)
      - Opens confirmation modal z serious warning
      - Requires password re-entry
      
[About Section]
  Heading: "O aplikacji"
  Info:
    - Wersja: 1.0.0 (z changelog link post-MVP)
    - Links: Privacy Policy | Terms of Service (external)
    - Support: "Pomoc" link do FAQ/contact (post-MVP)
```

**Change Password Modal**:
```
[Modal]
  Heading: "Zmień hasło"
  Content:
    - Info: "Wyślemy link do resetu hasła na Twój email"
    - Note: Email display
  Actions:
    - Button: "Wyślij link" → Supabase password reset email
    - Button: "Anuluj"
  Success: Toast "Link wysłany, sprawdź email"
```

**Delete Account Modal**:
```
[Modal - danger styling]
  Heading: "⚠️ Usuń konto"
  Content:
    - Warning: "Ta akcja jest nieodwracalna"
    - List konsekwencji:
      • Wszystkie fiszki zostaną usunięte
      • Historia sesji zostanie utracona
      • Dane nie będą mogły być odzyskane
  [Password Confirmation]
    - Input: "Wpisz hasło aby potwierdzić"
  Actions:
    - Button: "Usuń konto" (Destructive, disabled until password)
    - Button: "Anuluj"
  Success: Logout + redirect to landing z toast
```

**API Calls**:
- `GET /api/profile` → Load profile data
- `PUT /api/profile` → Update display name
- Supabase: Password reset email
- `DELETE /api/profile` (post-MVP, needs careful implementation)

---

### C. Strategia Integracji z API i Zarządzania Stanem

#### API Integration Architecture

**API Client Wrapper** (`src/lib/api/`):
```typescript
// Base client z auth header injection
class ApiClient {
  private baseURL = '/api';
  private supabase = createClient();
  
  async request(endpoint, options) {
    const { data: { session } } = await this.supabase.auth.getSession();
    const headers = {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    // ... fetch logic
  }
}

// Feature-specific API modules
export const flashcardsApi = {
  getAll: (params) => client.get('/flashcards', { params }),
  getById: (id) => client.get(`/flashcards/${id}`),
  getDue: (limit) => client.get('/flashcards/due', { params: { limit } }),
  create: (data) => client.post('/flashcards', data),
  update: (id, data) => client.put(`/flashcards/${id}`, data),
  delete: (id) => client.delete(`/flashcards/${id}`),
  review: (id, quality) => client.post(`/flashcards/${id}/review`, { quality })
};
```

#### State Management Strategy

**TanStack Query Setup** (`src/lib/queryClient.ts`):
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min default
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        // Global error handling
        toast.error(getErrorMessage(error));
      }
    }
  }
});
```

**Custom Hooks Pattern** (`src/lib/hooks/`):

**useFlashcards** - List management:
```typescript
export function useFlashcards(filters: FlashcardFilters) {
  return useQuery({
    queryKey: ['flashcards', filters],
    queryFn: () => flashcardsApi.getAll(filters),
    staleTime: 60 * 1000, // 1 min
    keepPreviousData: true // Smooth pagination
  });
}
```

**useFlashcardMutations** - CRUD operations:
```typescript
export function useFlashcardMutations() {
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: flashcardsApi.create,
    onMutate: async (newFlashcard) => {
      // Optimistic update
      await queryClient.cancelQueries(['flashcards']);
      const previousData = queryClient.getQueryData(['flashcards']);
      queryClient.setQueryData(['flashcards'], (old) => ({
        ...old,
        items: [newFlashcard, ...old.items]
      }));
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback
      queryClient.setQueryData(['flashcards'], context.previousData);
    },
    onSettled: () => {
      // Refetch dla sync
      queryClient.invalidateQueries(['flashcards']);
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: flashcardsApi.delete,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['flashcards']);
      toast.success('Fiszka usunięta', {
        action: {
          label: 'Cofnij',
          onClick: () => undoDelete(id)
        }
      });
    }
  });
  
  return { createMutation, deleteMutation, ... };
}
```

**useDueFlashcards** - Learning session:
```typescript
export function useDueFlashcards(limit = 20) {
  return useQuery({
    queryKey: ['flashcards', 'due', limit],
    queryFn: () => flashcardsApi.getDue(limit),
    staleTime: 0, // Always fresh dla accurate due dates
    refetchInterval: false // No auto-refetch podczas session
  });
}
```

**useReviewMutation** - Submit review:
```typescript
export function useReviewMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, quality }) => flashcardsApi.review(id, quality),
    onSuccess: () => {
      // Invalidate due cards i stats
      queryClient.invalidateQueries(['flashcards', 'due']);
      queryClient.invalidateQueries(['profile', 'stats']);
    }
  });
}
```

**useAuth** - Authentication state:
```typescript
export function useAuth() {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1
  });
}
```

**useProfile** - User profile + stats:
```typescript
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    staleTime: 5 * 60 * 1000 // 5 min, rarely changes
  });
}

export function useProfileStats() {
  return useQuery({
    queryKey: ['profile', 'stats'],
    queryFn: profileApi.getStats,
    staleTime: 60 * 1000, // 1 min
    refetchOnWindowFocus: true // Fresh na dashboard return
  });
}
```

#### Cache Invalidation Strategy

**Scenarios**:
1. **Create flashcard**: Invalidate `['flashcards']`, `['profile', 'stats']`
2. **Update flashcard**: Invalidate `['flashcards']`, specific card `['flashcard', id]`
3. **Delete flashcard**: Invalidate `['flashcards']`, `['profile', 'stats']`
4. **Complete review**: Invalidate `['flashcards', 'due']`, `['profile', 'stats']`
5. **Generate session**: Invalidate `['sessions']`, `['profile', 'stats']` (gdy accept)
6. **Update profile**: Invalidate `['profile']`
7. **Login/Logout**: Clear all queries

#### Local State Management

**Form State**: React Hook Form
```typescript
const form = useForm<FlashcardFormData>({
  resolver: zodResolver(flashcardSchema),
  defaultValues: { front: '', back: '' }
});
```

**UI State**: React useState dla:
- Modal open/close states
- Expand/collapse states
- Loading overlays
- Toast notifications
- Draft save indicators

**URL State**: React Router / Astro
- Filters, sort, pagination jako query params
- Browser history support

**localStorage**: Draft persistence
```typescript
// Auto-save draft
useEffect(() => {
  const timer = setTimeout(() => {
    if (inputText.length > 0) {
      localStorage.setItem('generation_draft', JSON.stringify({
        text: inputText,
        timestamp: Date.now()
      }));
    }
  }, 2000);
  return () => clearTimeout(timer);
}, [inputText]);
```

---

### D. Kwestie Responsywności, Dostępności i Bezpieczeństwa

#### Responsywność

**Breakpoints** (Tailwind 4):
- `sm`: 640px (large phones)
- `md`: 768px (tablets)
- `lg`: 1024px (laptops)
- `xl`: 1280px (desktops)
- `2xl`: 1536px (large screens)

**Responsive Patterns**:

1. **Navigation**:
   - Desktop: Full horizontal navbar
   - Mobile: Hamburger menu (collapsed) z slide-in drawer

2. **Dashboard Stats Cards**:
   - Desktop: 4 columns (grid-cols-4)
   - Tablet: 2x2 grid (grid-cols-2)
   - Mobile: Stack (grid-cols-1)

3. **Flashcards List**:
   - Desktop: Table view z full columns
   - Tablet: Table z collapsed columns (hide less important)
   - Mobile: Card stack (każda fiszka jako card)

4. **Learning Session**:
   - Desktop: Centered card (max-width 800px), horizontal rating buttons
   - Mobile: Fullscreen card, vertical stacked rating buttons (full-width)

5. **Forms**:
   - Desktop: Side-by-side labels i inputs
   - Mobile: Stacked (label above input)

6. **Modals**:
   - Desktop: Centered (max-width 600px), margin around
   - Mobile: Full-screen takeover (100vw, 100vh), slide-up animation

**Touch Targets**:
- Minimum: 44x44px (Apple HIG, WCAG 2.5.5)
- Spacing: Min 8px between targets
- Button padding: py-3 px-4 minimum

**Typography Scale**:
- Responsive sizing: `text-base lg:text-lg`
- Line height: 1.5 dla body, 1.2 dla headings
- Font smoothing: antialiased

**Images & Media**:
- (MVP: no images w user content)
- Icons: responsive sizes (w-5 h-5 on mobile, w-6 h-6 on desktop)

#### Dostępność (WCAG AA)

**Color Contrast**:
- Text/background: Minimum 4.5:1
- Large text (18pt+): Minimum 3:1
- UI components: Minimum 3:1
- Tool: Use contrast checker durante design

**Semantic HTML**:
```html
<nav> dla navigation
<main> dla main content
<aside> dla sidebars
<article> dla independent content
<section> dla thematic groupings
<button> dla actions (nie <div onClick>)
<a> dla navigation (nie <button>)
```

**ARIA Labels**:
```html
<button aria-label="Usuń fiszkę">
  <TrashIcon />
</button>

<nav aria-label="Main navigation">...</nav>

<input aria-describedby="email-hint" />
<span id="email-hint">Wpisz poprawny adres email</span>
```

**Keyboard Navigation**:
- Tab order: Logical i sequential
- Focus indicators: Visible outline (ring-2 ring-primary)
- Skip to main content link (visually hidden until focus)
- Keyboard shortcuts dla learning session (Space, 1-4, Esc)
- Modal traps: Focus trapped w modal (react-aria, Radix)

**Screen Readers**:
- Alt text dla decorative icons (empty string)
- Descriptive text dla functional icons (via aria-label)
- Live regions dla dynamic content:
  ```html
  <div aria-live="polite" aria-atomic="true">
    Fiszka usunięta. <button>Cofnij</button>
  </div>
  ```
- Loading states announced: aria-busy="true"

**Form Accessibility**:
- Labels z htmlFor attr
- Error messages z aria-invalid i aria-describedby
- Required fields z aria-required lub required attr
- Field hints linked z aria-describedby

**Focus Management**:
- Modal open: Focus moves to modal (first focusable element)
- Modal close: Focus returns to trigger element
- Page transitions: Focus moves to h1 lub skip link

**Motion & Animation**:
- Respect prefers-reduced-motion:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

**Error Identification**:
- Nie tylko color-based (icon + text)
- Clear, descriptive error messages
- Context dla jak fix error

#### Bezpieczeństwo

**Authentication & Authorization**:

1. **Supabase Auth Flow**:
   - JWT access tokens (1h expiry)
   - Refresh tokens (secure, httpOnly cookie)
   - Automatic token refresh przez SDK
   - No manual token storage w localStorage

2. **Row Level Security (RLS)**:
   - Database-level policies
   - All tables: `auth.uid() = user_id` filter
   - Create: User can only create own resources
   - Read: User can only read own resources
   - Update/Delete: User can only modify own resources

3. **Middleware Protection**:
   ```typescript
   // src/middleware/index.ts
   export async function onRequest(context, next) {
     const { data: { user } } = await context.locals.supabase.auth.getUser();
     
     if (!user && isProtectedRoute(context.url.pathname)) {
       return context.redirect('/login');
     }
     
     return next();
   }
   ```

**Input Validation & Sanitization**:

1. **Client-Side** (React Hook Form + Zod):
   ```typescript
   const flashcardSchema = z.object({
     front: z.string()
       .min(1, 'Pytanie nie może być puste')
       .max(500, 'Maksymalnie 500 znaków')
       .trim(),
     back: z.string()
       .min(1, 'Odpowiedź nie może być pusta')
       .max(1000, 'Maksymalnie 1000 znaków')
       .trim()
   });
   ```

2. **Server-Side** (Zod + Database Constraints):
   - Validate all inputs przed database operations
   - Sanitize strings (trim, remove dangerous chars)
   - Database constraints jako last line of defense
   - Parameterized queries (Supabase handles)

3. **No Dangerous Content**:
   - Plain text only (no HTML, no scripts)
   - React automatic escaping
   - No dangerouslySetInnerHTML w MVP

**XSS Prevention**:
- React automatic escaping
- No user HTML content
- CSP headers (post-MVP):
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'
  ```

**CSRF Protection**:
- Supabase handles token-based auth (no cookies dla auth)
- SameSite cookie policy (post-MVP jeśli needed)

**Rate Limiting**:
- AI generation: 2 requests/day per user
- Server-side tracking (database `generation_sessions` count)
- Client-side display (proactive)
- API endpoint: Return 429 z Retry-After header

**Secure Communication**:
- HTTPS only (enforced przez Supabase + hosting)
- No sensitive data w URL query params
- No API keys/secrets w client code

**Error Handling** (Security Perspective):
- No detailed error messages do user (leak info)
- Generic messages: "Coś poszło nie tak" vs "User 123 not found"
- Detailed errors tylko w server logs
- No stack traces w production

**Session Management**:
- Automatic logout po token expiry
- Refresh token rotation (Supabase default)
- Logout clears all client-side cache
- No "remember me" w MVP (security over convenience)

**Dependency Security**:
- Regular `npm audit`
- Automated dependency updates (Dependabot)
- Review security advisories
- Pin major versions, allow patch updates

**Secrets Management**:
- `.env` file nie w git (gitignore)
- Environment variables dla API keys
- Supabase anon key safe dla client (RLS protects)
- No service role key w client code

---

### E. Wszelkie Nierozwiązane Kwestie lub Obszary Wymagające Dalszego Wyjaśnienia

### </ui_architecture_planning_summary>

### <unresolved_issues>

## Nierozwiązane Kwestie i Obszary do Dalszej Analizy

### 1. **Full-Text Search Implementation**

**Status**: Zaplanowane post-MVP

**Pytania**:
- Czy używać Postgres full-text search (tsvector) czy external service (Algolia, Meilisearch)?
- Jakie pola indexować? (front, back, input_text?)
- Jak handleować Polish language stemming?
- Performance considerations dla large datasets?

**Decision Needed For**: Gdy users będą mieli >100 fiszek

---

### 2. **Mobile App Strategy**

**Status**: Web-only w MVP

**Pytania**:
- Progressive Web App (PWA) approach czy native apps?
- Timing: Po MVP czy po kilku miesiącach adoption?
- Offline-first considerations dla mobile?
- Push notifications (dla due cards reminders)?

**Decision Needed For**: Post-MVP roadmap planning

---

### 3. **Real-Time Synchronization Across Tabs**

**Status**: Independent tabs w MVP, refetch-on-focus

**Pytania**:
- Czy wystarczająco dobre UX czy frustrujące dla users?
- Supabase Realtime vs BroadcastChannel API?
- Performance impact (connection overhead)?
- Cost considerations (Supabase Realtime pricing)?

**Decision Needed For**: Post-MVP jeśli user feedback wskazuje na problem

---

### 4. **Analytics & Metrics Collection**

**Status**: Basic stats tylko (dashboard metrics)

**Pytania**:
- Jakie detailed analytics są potrzebne? (retention, engagement, feature usage)
- Self-hosted (Plausible) czy cloud (Google Analytics, Mixpanel)?
- Privacy considerations (GDPR compliance)?
- Event tracking strategy (co trackować)?

**Decision Needed For**: Post-MVP, product insights needed

---

### 5. **Error Logging & Monitoring**

**Status**: Console logging w MVP, no centralized system

**Pytania**:
- Sentry vs LogRocket vs Datadog?
- Co logować (errors only czy też performance metrics)?
- Sampling rate dla production (cost considerations)?
- Alerts strategy (kto dostaje notifications)?

**Decision Needed For**: Before production launch (critical dla debugging)

---

### 6. **Content Length Limits - Optimal Values**

**Status**: Arbitrary limits set (500 front, 1000 back, 10000 input)

**Pytania**:
- Czy te limity są sensowne based na real usage?
- Jak handleować edge cases (very long content)?
- Czy pokazywać word count vs character count?
- Truncation strategy dla display (150 chars obecnie)?

**Decision Needed For**: User testing phase - adjust based na feedback

---

### 7. **AI Model Selection & Fallbacks**

**Status**: OpenRouter API, model TBD w implementacji

**Pytania**:
- Który model? (GPT-4, Claude, Llama?)
- Fallback strategy jeśli primary model unavailable?
- Cost per generation vs quality trade-off?
- Prompt engineering - final prompts?
- Retry strategy dla API failures?

**Decision Needed For**: Implementation phase (przed coding generationService)

---

### 8. **Export/Import Functionality**

**Status**: Out of scope dla MVP

**Pytania**:
- Formaty: JSON, CSV, Anki (.apkg)?
- Anki compatibility - jak mapować SM-2 parameters?
- Import validation strategy?
- Bulk operations UX?

**Decision Needed For**: Post-MVP, based na user requests

---

### 9. **Collaborative Features Scope**

**Status**: Out of scope dla MVP (single-user only)

**Pytania**:
- Shared decks - read-only czy collaborative editing?
- Permissions model (owner, editor, viewer)?
- Discovery mechanism (public gallery)?
- Revenue model implications (premium feature)?

**Decision Needed For**: Post-MVP, depends on business model

---

### 10. **Spaced Repetition Algorithm Customization**

**Status**: SM-2 algorithm hardcoded

**Pytania**:
- Czy users powinni móc adjust parameters (intervals, ease factors)?
- Alternative algorithms (SM-17, FSRS)?
- A/B testing different algorithms?
- Advanced user settings vs simplicity?

**Decision Needed For**: Post-MVP, based na power user feedback

---

### 11. **Performance Optimization Thresholds**

**Status**: Basic optimization (pagination, indexes, caching)

**Pytania**:
- Przy ilu fiszkach performance becomes issue? (1000? 10000?)
- Virtual scrolling needed dla long lists?
- Database partitioning strategy?
- CDN dla static assets?
- Service workers dla caching?

**Decision Needed For**: Load testing phase

---

### 12. **Legal & Compliance**

**Status**: Placeholder links dla Privacy Policy i Terms of Service

**Pytania**:
- GDPR compliance requirements (EU users)?
- Data retention policy?
- Right to be forgotten implementation?
- Cookie consent (needed jeśli analytics)?
- Terms of service dla AI-generated content?

**Decision Needed For**: Before public launch (legal review needed)

---

### 13. **Internationalization (i18n) Strategy**

**Status**: Polish only w MVP

**Pytania**:
- Timing dla English version?
- i18n library (react-i18next, next-intl)?
- URL structure (/pl/, /en/ vs subdomain)?
- AI generation w different languages (separate prompts)?
- RTL support (Arabic, Hebrew) considerations?

**Decision Needed For**: Post-MVP, depends on market expansion plans

---

### 14. **Pricing & Monetization Model**

**Status**: Nie określony w PRD/Architektura

**Pytania**:
- Free tier limits (2 generations/day currently)?
- Premium tier features?
- Payment processing (Stripe, PayPal)?
- Subscription vs pay-per-use?
- Refund policy?

**Decision Needed For**: Business model definition (before launch)

---

### 15. **Backup & Data Recovery**

**Status**: Supabase automatic backups (presumably)

**Pytania**:
- User-initiated backups/downloads?
- Point-in-time recovery dla accidental deletes?
- Disaster recovery plan?
- Data export dla account deletion?

**Decision Needed For**: Production operations planning

---

### 16. **A/B Testing Infrastructure**

**Status**: Nie planowane w MVP

**Pytania**:
- Feature flags system?
- A/B testing library (Optimizely, LaunchDarkly, custom)?
- Metrics collection dla experiments?
- Statistical significance calculations?

**Decision Needed For**: Post-MVP optimization phase

---

### 17. **Accessibility Audit Scope**

**Status**: WCAG AA targeted, no professional audit planned

**Pytania**:
- Czy hire accessibility consultant?
- Automated testing (axe-core, Lighthouse) wystarczające?
- Screen reader testing (które? NVDA, JAWS, VoiceOver)?
- User testing z disabled users?

**Decision Needed For**: Before claiming WCAG compliance

---

### 18. **Performance Budgets**

**Status**: Lighthouse >90 target, no specific budgets

**Pytania**:
- JavaScript bundle size limit?
- First Contentful Paint target?
- Time to Interactive target?
- CSS bundle size limit?
- Monitoring w production?

**Decision Needed For**: Performance optimization phase

---

### 19. **SEO Strategy dla Landing Page**

**Status**: Nie określony (Astro SSG friendly)

**Pytania**:
- Meta tags strategy?
- Open Graph images?
- Sitemap generation?
- Structured data (Schema.org)?
- Blog dla content marketing?

**Decision Needed For**: Marketing planning

---

### 20. **Help & Documentation System**

**Status**: Minimal (placeholder "Pomoc" link w settings)

**Pytania**:
- In-app tooltips/tours (Intro.js, Shepherd)?
- Dedicated FAQ page?
- Video tutorials?
- Contextual help (? icons z popovers)?
- Chatbot support?

**Decision Needed For**: User onboarding optimization (post-MVP)

---

### Priorytety dla Rozwiązania:

**🔴 Critical (Przed Production Launch)**:
- #7: AI Model Selection & Fallbacks
- #12: Legal & Compliance
- #5: Error Logging & Monitoring (przynajmniej basic)

**🟡 High Priority (Pierwsze 3 miesiące post-MVP)**:
- #6: Content Length Limits validation przez user testing
- #17: Accessibility Audit
- #11: Performance thresholds identification
- #14: Pricing Model (jeśli monetization planned)

**🟢 Medium Priority (Post-MVP Roadmap)**:
- #3: Real-Time Sync (based na user feedback)
- #4: Analytics & Metrics
- #8: Export/Import (Anki)
- #20: Help System

**⚪ Low Priority (Nice to Have)**:
- #2: Mobile App Strategy
- #9: Collaborative Features
- #10: Algorithm Customization
- #13: Internationalization
- #16: A/B Testing Infrastructure
- #19: SEO Strategy

### </unresolved_issues>

## </conversation_summary>

---

## Następne Kroki

### 1. **Review & Approval**
- [ ] Przegląd tego podsumowania przez zespół/stakeholders
- [ ] Clarification nierozwiązanych kwestii priorytetowych
- [ ] Finalizacja decyzji dla critical items

### 2. **Implementation Planning**
- [ ] Breakdown Implementation Checklist na sprint tasks
- [ ] Assign priorities (MVP Phase 1, 2, 3)
- [ ] Estimate effort dla każdego task
- [ ] Setup project management (Jira, Linear, GitHub Projects)

### 3. **Technical Setup**
- [ ] Initialize Astro 5 project
- [ ] Configure all dependencies
- [ ] Setup development environment
- [ ] Configure CI/CD pipeline
- [ ] Setup staging environment

### 4. **Design Phase**
- [ ] Create design system (colors, typography, spacing)
- [ ] High-fidelity mockups dla kluczowych widoków (optional, MVP może być coded directly)
- [ ] Component library setup (shadcn/ui configuration)

### 5. **Development**
- [ ] Rozpoczęcie implementacji według checklisty z dokumentu architektury
- [ ] Iteracyjne delivery: Setup → Auth → Dashboard → Generation → Learning → etc.
- [ ] Continuous code review i refactoring

### 6. **Testing & QA**
- [ ] Unit testing (critical logic)
- [ ] Integration testing (API flows)
- [ ] E2E testing (key user flows)
- [ ] Cross-browser testing
- [ ] Responsive testing
- [ ] Accessibility audit

### 7. **Pre-Launch**
- [ ] Performance optimization
- [ ] Security review
- [ ] Legal compliance (privacy policy, terms)
- [ ] Error monitoring setup
- [ ] Beta testing z small user group
- [ ] Final bug fixes

### 8. **Launch**
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] User feedback collection mechanism
- [ ] Post-launch bug tracking
- [ ] Iterative improvements based na real usage

---

**Dokument przygotowany:** 2025-10-26  
**Status:** Gotowy do rozpoczęcia implementacji  
**Źródło:** .ai/asystent_planowania_architektury.md v1.0

