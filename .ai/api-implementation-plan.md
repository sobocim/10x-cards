# API Implementation Plan - 10xCards

## Overview

This document provides a comprehensive implementation plan for all 23 REST API endpoints in the 10xCards application. The plan follows the project's tech stack (Astro 5, TypeScript 5, Supabase) and coding practices.

**Total Endpoints**: 23
- Authentication: 4 endpoints
- User Profile: 3 endpoints
- Flashcards: 7 endpoints
- AI Generation: 2 endpoints
- Generation Sessions: 2 endpoints

---

## Global Implementation Guidelines

### Common Patterns

**1. Error Response Format**
```typescript
{
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }
}
```

**2. Authentication Check Pattern**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return new Response(JSON.stringify({
    error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
  }), { status: 401 });
}
```

**3. Validation Pattern (using Zod)**
```typescript
const result = schema.safeParse(body);
if (!result.success) {
  return new Response(JSON.stringify({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: result.error.flatten()
    }
  }), { status: 400 });
}
```

### Shared Services

**Location**: `/src/lib/services/`

Services to create:
- `authService.ts` - Authentication operations
- `profileService.ts` - Profile CRUD and stats
- `flashcardService.ts` - Flashcard CRUD and review logic
- `generationService.ts` - AI generation and acceptance
- `validationService.ts` - Zod schemas and validation helpers

---

# AUTHENTICATION ENDPOINTS

## 1. POST /api/auth/signup - User Registration

### 1.1 Overview
Creates a new user account and automatically creates an associated profile. This is the entry point for new users.

### 1.2 Request Details

**HTTP Method**: POST  
**File Path**: `/src/pages/api/auth/signup.ts`  
**Authentication**: None (public endpoint)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe" // optional
}
```

### 1.3 Utilized Types

**From `src/types.ts`**:
- `SignupRequest` (request DTO)
- `AuthResponse` (response DTO)
- `ErrorResponse`

**From `src/db/types.ts`**:
- `ProfileInsert`

### 1.4 Response Details

**Success (201 Created)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid email format or weak password
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Database or auth service error

### 1.5 Data Flow

1. Validate request body with Zod schema
2. Call `supabase.auth.signUp()` to create user
3. **Important**: Create profile in `profiles` table (Supabase won't auto-create)
4. Return user info and session tokens

### 1.6 Security Considerations

- **Password Strength**: Enforce minimum 8 characters, mix of letters/numbers
- **Email Validation**: RFC 5322 compliant email format
- **Rate Limiting**: Implement IP-based rate limiting (max 5 signups/hour per IP)
- **SQL Injection**: Prevented by Supabase client (parameterized queries)
- **XSS**: Sanitize displayName input

### 1.7 Error Handling

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid email format | 400 | VALIDATION_ERROR | Invalid email address |
| Weak password | 400 | VALIDATION_ERROR | Password must be at least 8 characters |
| Email exists | 409 | CONFLICT | User with this email already exists |
| Profile creation fails | 500 | INTERNAL_ERROR | Failed to create user profile |
| Supabase auth error | 500 | INTERNAL_ERROR | Authentication service error |

### 1.8 Performance Considerations

- Profile creation is synchronous - should complete in <100ms
- No external API calls except Supabase Auth
- Database writes: 2 (auth.users + profiles table)

### 1.9 Implementation Steps

1. **Create Zod validation schema** (`src/lib/services/validationService.ts`)
   ```typescript
   export const signupSchema = z.object({
     email: z.string().email(),
     password: z.string().min(8).max(72),
     displayName: z.string().max(100).optional()
   });
   ```

2. **Create auth service** (`src/lib/services/authService.ts`)
   ```typescript
   export async function signUp(data: SignupRequest): Promise<AuthResponse>
   ```

3. **Create API route** (`src/pages/api/auth/signup.ts`)
   - Set `export const prerender = false`
   - Implement POST handler
   - Validate input
   - Call authService.signUp()
   - Handle errors with proper status codes

4. **Create profile after signup**
   ```typescript
   await supabase.from('profiles').insert({
     user_id: user.id,
     display_name: displayName || null
   });
   ```

5. **Add error logging**
   - Log failed signup attempts (email hash only, not actual email)
   - Log profile creation failures with user ID

---

## 2. POST /api/auth/login - User Login

### 2.1 Overview
Authenticates existing users and returns session tokens.

### 2.2 Request Details

**HTTP Method**: POST  
**File Path**: `/src/pages/api/auth/login.ts`  
**Authentication**: None (public endpoint)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### 2.3 Utilized Types

- `LoginRequest` (request DTO)
- `AuthResponse` (response DTO)

### 2.4 Response Details

**Success (200 OK)**: Same as signup

**Error Responses**:
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Auth service error

### 2.5 Data Flow

1. Validate request body
2. Call `supabase.auth.signInWithPassword()`
3. Return session tokens

### 2.6 Security Considerations

- **Rate Limiting**: Max 5 failed attempts per IP per 15 minutes
- **Brute Force Protection**: Lock account after 10 failed attempts
- **Timing Attacks**: Use constant-time comparison for credentials
- **Session Security**: Tokens expire after 1 hour

### 2.7 Error Handling

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Missing credentials | 400 | VALIDATION_ERROR |
| Invalid credentials | 401 | UNAUTHORIZED |
| Account locked | 403 | FORBIDDEN |
| Auth service error | 500 | INTERNAL_ERROR |

### 2.8 Implementation Steps

1. Create validation schema
2. Add to authService: `signIn(data: LoginRequest)`
3. Create API route with POST handler
4. Implement rate limiting middleware
5. Log failed login attempts

---

## 3. POST /api/auth/logout - User Logout

### 3.1 Overview
Invalidates the current session and logs the user out.

### 3.2 Request Details

**HTTP Method**: POST  
**File Path**: `/src/pages/api/auth/logout.ts`  
**Authentication**: Required (Bearer token)

**Headers**:
```
Authorization: Bearer {access_token}
```

### 3.3 Utilized Types

None (no request/response body)

### 3.4 Response Details

**Success (204 No Content)**: Empty response

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token

### 3.5 Data Flow

1. Get user from token
2. Call `supabase.auth.signOut()`
3. Return 204

### 3.6 Implementation Steps

1. Create API route
2. Verify authentication
3. Call Supabase signOut
4. Return 204 status

---

## 4. GET /api/auth/user - Get Current User

### 4.1 Overview
Returns the currently authenticated user with their profile data.

### 4.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/auth/user.ts`  
**Authentication**: Required

### 4.3 Utilized Types

- `CurrentUserResponse`

### 4.4 Response Details

**Success (200 OK)**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "profile": {
    "displayName": "John Doe",
    "totalCardsCreated": 45,
    "totalCardsGeneratedByAI": 30,
    "dailyGenerationCount": 2,
    "lastGenerationDate": "2025-10-26"
  }
}
```

### 4.5 Data Flow

1. Verify authentication
2. Fetch user profile from database
3. Combine user data with profile
4. Return combined response

### 4.6 Implementation Steps

1. Create API route
2. Get authenticated user
3. Query profiles table
4. Format and return response

---

# USER PROFILE ENDPOINTS

## 5. GET /api/profile - Get User Profile

### 5.1 Overview
Retrieves the complete profile for the authenticated user.

### 5.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/profile/index.ts`  
**Authentication**: Required

### 5.3 Utilized Types

- `ProfileResponse`

### 5.4 Response Details

**Success (200 OK)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "displayName": "John Doe",
  "totalCardsCreated": 45,
  "totalCardsGeneratedByAI": 30,
  "dailyGenerationCount": 2,
  "lastGenerationDate": "2025-10-26",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-10-26T14:30:00Z"
}
```

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Profile doesn't exist

### 5.5 Data Flow

1. Verify authentication
2. Query `profiles` table filtered by `auth.uid()` (RLS handles this)
3. Transform snake_case to camelCase
4. Return profile

### 5.6 Security Considerations

- **RLS Protection**: Supabase RLS ensures users only see their own profile
- **No PII Leakage**: Only return fields defined in ProfileResponse

### 5.7 Implementation Steps

1. Create profileService with `getProfile(userId: string)`
2. Create API route with GET handler
3. Transform database response to camelCase DTO
4. Handle 404 if profile doesn't exist

---

## 6. PATCH /api/profile - Update User Profile

### 6.1 Overview
Updates the user's display name (only editable field).

### 6.2 Request Details

**HTTP Method**: PATCH  
**File Path**: `/src/pages/api/profile/index.ts`  
**Authentication**: Required

**Request Body**:
```json
{
  "displayName": "Jane Doe"
}
```

### 6.3 Utilized Types

- `UpdateProfileRequest`
- `ProfileResponse`

### 6.4 Response Details

**Success (200 OK)**: Updated profile (ProfileResponse)

**Error Responses**:
- `400 Bad Request` - Invalid display name (empty or >100 chars)
- `401 Unauthorized` - Not authenticated

### 6.5 Data Flow

1. Verify authentication
2. Validate displayName (max 100 chars)
3. Update profiles table
4. Return updated profile

### 6.6 Validation Rules

- displayName: optional, max 100 characters
- Strip leading/trailing whitespace
- Reject if only whitespace

### 6.7 Implementation Steps

1. Create validation schema
2. Add to profileService: `updateProfile(userId, data)`
3. Implement PATCH handler
4. Return updated profile

---

## 7. GET /api/profile/stats - Get User Statistics

### 7.1 Overview
Returns comprehensive statistics calculated by the `get_user_stats()` database function.

### 7.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/profile/stats.ts`  
**Authentication**: Required

### 7.3 Utilized Types

- `UserStatsResponse`

### 7.4 Response Details

**Success (200 OK)**:
```json
{
  "totalCardsCreated": 45,
  "totalCardsGeneratedByAI": 30,
  "cardsDueToday": 12,
  "totalReviewsCompleted": 120,
  "totalGenerationSessions": 8,
  "totalAcceptedCards": 30,
  "averageAcceptanceRate": 83.33,
  "dailyGenerationCount": 2,
  "lastGenerationDate": "2025-10-26"
}
```

### 7.5 Data Flow

1. Verify authentication
2. Call database function: `supabase.rpc('get_user_stats', { user_uuid: user.id })`
3. Transform to camelCase
4. Return statistics

### 7.6 Performance Considerations

- Function runs complex aggregations - cache result for 5 minutes
- Response time: ~50-200ms depending on user's card count

### 7.7 Implementation Steps

1. Create wrapper in profileService: `getUserStats(userId)`
2. Create API route
3. Call RPC function
4. Implement caching (in-memory or Redis)

---

# FLASHCARD ENDPOINTS

## 8. GET /api/flashcards - List User Flashcards

### 8.1 Overview
Returns paginated list of user's flashcards with filtering and sorting.

### 8.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/flashcards/index.ts`  
**Authentication**: Required

**Query Parameters**:
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Items per page
- `source` (optional) - Filter: `ai_generated` or `manual`
- `sort` (optional, default: `created_at:desc`) - Sort: `field:direction`

### 8.3 Utilized Types

- `FlashcardsListParams`
- `FlashcardsListResponse`
- `FlashcardResponse`
- `PaginationMeta`

### 8.4 Response Details

**Success (200 OK)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "generationSessionId": "uuid",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is...",
      "source": "ai_generated",
      "easeFactor": 2.5,
      "intervalDays": 0,
      "repetitions": 0,
      "nextReviewDate": "2025-10-26T10:00:00Z",
      "lastReviewedAt": null,
      "createdAt": "2025-10-26T10:00:00Z",
      "updatedAt": "2025-10-26T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid query parameters (limit > 100, invalid sort)
- `401 Unauthorized` - Not authenticated

### 8.5 Data Flow

1. Verify authentication
2. Parse and validate query parameters
3. Build Supabase query:
   - Filter by user_id (automatic via RLS)
   - Apply source filter if provided
   - Apply sorting
   - Apply pagination (range)
4. Execute query to get data + count
5. Calculate pagination metadata
6. Transform to camelCase
7. Return response

### 8.6 Validation Rules

- page: positive integer, default 1
- limit: integer 1-100, default 20
- source: must be 'ai_generated' or 'manual' if provided
- sort: format `field:direction` where direction is 'asc' or 'desc'
  - Allowed fields: created_at, updated_at, front, next_review_date

### 8.7 Performance Considerations

- Use database indexes on (user_id, created_at)
- Cache first page for 1 minute
- Response time: ~50-100ms

### 8.8 Implementation Steps

1. Create query parameter validation schema
2. Create flashcardService: `listFlashcards(userId, params)`
3. Implement pagination logic
4. Create API route with GET handler
5. Transform and return data

---

## 9. GET /api/flashcards/[id] - Get Single Flashcard

### 9.1 Overview
Retrieves a single flashcard by ID.

### 9.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/flashcards/[id].ts`  
**Authentication**: Required

**URL Parameters**:
- `id` (required) - Flashcard UUID

### 9.3 Utilized Types

- `FlashcardResponse`

### 9.4 Response Details

**Success (200 OK)**: Single FlashcardResponse

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard doesn't exist or doesn't belong to user

### 9.5 Data Flow

1. Verify authentication
2. Extract ID from URL params
3. Query flashcards table by ID
4. RLS ensures user can only see their own card
5. Return 404 if not found
6. Transform and return flashcard

### 9.6 Implementation Steps

1. Add to flashcardService: `getFlashcard(id)`
2. Create dynamic route file
3. Extract ID from `Astro.params.id`
4. Call service
5. Handle 404 case

---

## 10. POST /api/flashcards - Create Flashcard (Manual)

### 10.1 Overview
Creates a new flashcard manually (not AI-generated).

### 10.2 Request Details

**HTTP Method**: POST  
**File Path**: `/src/pages/api/flashcards/index.ts`  
**Authentication**: Required

**Request Body**:
```json
{
  "front": "What is the capital of France?",
  "back": "Paris"
}
```

### 10.3 Utilized Types

- `CreateFlashcardRequest`
- `FlashcardResponse`
- `CreateFlashcardCommand` (internal)

### 10.4 Response Details

**Success (201 Created)**: Created flashcard (FlashcardResponse)

**Error Responses**:
- `400 Bad Request` - Validation errors:
  - Front text empty or > 1000 characters
  - Back text empty or > 2000 characters
- `401 Unauthorized` - Not authenticated

### 10.5 Data Flow

1. Verify authentication
2. Validate request body
3. Create flashcard in database:
   ```typescript
   {
     user_id: user.id,
     front: front.trim(),
     back: back.trim(),
     source: 'manual',
     generation_session_id: null
   }
   ```
4. Database triggers update profile statistics
5. Return created flashcard

### 10.6 Validation Rules

- front: required, 1-1000 characters after trim
- back: required, 1-2000 characters after trim
- Strip leading/trailing whitespace
- Database constraints will also validate

### 10.7 Security Considerations

- **XSS Prevention**: Sanitize front/back text (escape HTML)
- **RLS**: user_id automatically set to auth.uid()
- **SQL Injection**: Prevented by Supabase client

### 10.8 Implementation Steps

1. Create validation schema
2. Add to flashcardService: `createFlashcard(userId, data)`
3. Implement POST handler
4. Insert into database
5. Return 201 with created resource

---

## 11. PATCH /api/flashcards/[id] - Update Flashcard

### 11.1 Overview
Updates the front and/or back text of an existing flashcard.

### 11.2 Request Details

**HTTP Method**: PATCH  
**File Path**: `/src/pages/api/flashcards/[id].ts`  
**Authentication**: Required

**URL Parameters**: `id` (flashcard UUID)

**Request Body**:
```json
{
  "front": "Updated question?",
  "back": "Updated answer"
}
```

### 11.3 Utilized Types

- `UpdateFlashcardRequest`
- `FlashcardResponse`
- `UpdateFlashcardCommand` (internal)

### 11.4 Response Details

**Success (200 OK)**: Updated flashcard

**Error Responses**:
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user

### 11.5 Data Flow

1. Verify authentication
2. Validate request body (at least one field must be provided)
3. Update flashcard in database
4. RLS ensures user can only update their own cards
5. Return updated flashcard

### 11.6 Validation Rules

- At least one of front or back must be provided
- front: 1-1000 characters if provided
- back: 1-2000 characters if provided

### 11.7 Implementation Steps

1. Create validation schema
2. Add to flashcardService: `updateFlashcard(id, data)`
3. Implement PATCH handler
4. Update database
5. Return updated card or 404

---

## 12. DELETE /api/flashcards/[id] - Delete Flashcard

### 12.1 Overview
Permanently deletes a flashcard.

### 12.2 Request Details

**HTTP Method**: DELETE  
**File Path**: `/src/pages/api/flashcards/[id].ts`  
**Authentication**: Required

**URL Parameters**: `id` (flashcard UUID)

### 12.3 Utilized Types

None (no request/response body)

### 12.4 Response Details

**Success (204 No Content)**: Empty response

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user

### 12.5 Data Flow

1. Verify authentication
2. Delete flashcard from database
3. RLS ensures user can only delete their own cards
4. Database triggers update profile statistics
5. Return 204

### 12.6 Implementation Steps

1. Add to flashcardService: `deleteFlashcard(id)`
2. Implement DELETE handler
3. Delete from database
4. Return 204 or 404

---

## 13. GET /api/flashcards/due - Get Cards Due for Review

### 13.1 Overview
Returns flashcards that are due for review based on SM-2 algorithm scheduling.

### 13.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/flashcards/due.ts`  
**Authentication**: Required

**Query Parameters**:
- `limit` (optional, default: 20, max: 100) - Maximum cards to return

### 13.3 Utilized Types

- `CardsDueResponse`
- `CardDueForReview`

### 13.4 Response Details

**Success (200 OK)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is...",
      "easeFactor": 2.5,
      "intervalDays": 0,
      "repetitions": 0,
      "nextReviewDate": "2025-10-26T10:00:00Z",
      "lastReviewedAt": null
    }
  ],
  "count": 12
}
```

### 13.5 Data Flow

1. Verify authentication
2. Call database function: `supabase.rpc('get_cards_due_for_review', { user_uuid: user.id, limit_count: limit })`
3. Function returns cards where `next_review_date <= NOW()`
4. Sorted by next_review_date ASC, then random
5. Transform and return

### 13.6 Performance Considerations

- Database function uses index on (user_id, next_review_date)
- No caching (real-time data)
- Response time: ~20-50ms

### 13.7 Implementation Steps

1. Add to flashcardService: `getCardsDue(userId, limit)`
2. Create API route
3. Call RPC function
4. Transform and return data

---

## 14. POST /api/flashcards/[id]/review - Review Flashcard (SM-2)

### 14.1 Overview
Records a review of a flashcard and updates SM-2 algorithm parameters.

### 14.2 Request Details

**HTTP Method**: POST  
**File Path**: `/src/pages/api/flashcards/[id]/review.ts`  
**Authentication**: Required

**URL Parameters**: `id` (flashcard UUID)

**Request Body**:
```json
{
  "quality": 4
}
```

**Quality Scale**:
- 0: Complete blackout
- 1: Incorrect, but answer seemed familiar
- 2: Incorrect, but easy to recall
- 3: Correct with difficulty
- 4: Correct after hesitation
- 5: Perfect response

### 14.3 Utilized Types

- `ReviewCardRequest`
- `FlashcardResponse`
- `ReviewFlashcardCommand` (internal)

### 14.4 Response Details

**Success (200 OK)**: Updated flashcard with new SM-2 parameters

**Error Responses**:
- `400 Bad Request` - Invalid quality (not 0-5)
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard not found

### 14.5 Data Flow

1. Verify authentication
2. Validate quality (0-5)
3. Call database function: `supabase.rpc('update_card_review', { card_uuid: id, quality })`
4. Function implements SM-2 algorithm:
   - If quality >= 3: increment repetitions, calculate new interval and ease factor
   - If quality < 3: reset to repetitions=0, interval=1 day
5. Return updated flashcard

### 14.6 SM-2 Algorithm Logic

**Database function handles**:
- Ease factor calculation: `EF + (0.1 - (5-quality) * (0.08 + (5-quality) * 0.02))`
- Minimum EF: 1.3
- Interval progression: 1 day → 6 days → previous_interval * EF

### 14.7 Validation Rules

- quality: required integer 0-5
- Use type guard: `isValidQuality()`

### 14.8 Implementation Steps

1. Create validation schema
2. Add to flashcardService: `reviewCard(id, quality)`
3. Create nested route file
4. Validate quality with type guard
5. Call RPC function
6. Return updated card

---

# AI GENERATION ENDPOINTS

## 15. POST /api/generate - Generate Flashcards from Text

### 15.1 Overview
Generates flashcard suggestions from user-provided text using AI (OpenRouter.ai).

### 15.2 Request Details

**HTTP Method**: POST  
**File Path**: `/src/pages/api/generate/index.ts`  
**Authentication**: Required

**Request Body**:
```json
{
  "inputText": "PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance. It uses and extends the SQL language combined with many features that safely store and scale the most complicated data workloads...",
  "model": "anthropic/claude-3-5-sonnet"
}
```

### 15.3 Utilized Types

- `GenerateFlashcardsRequest`
- `GenerateFlashcardsResponse`
- `GeneratedCard`
- `CreateGenerationSessionCommand` (internal)

### 15.4 Response Details

**Success (200 OK)**:
```json
{
  "sessionId": "uuid",
  "status": "success",
  "generatedCards": [
    {
      "id": "temp_uuid_1",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is a powerful, open source object-relational database system..."
    }
  ],
  "generatedCount": 5,
  "generationTimeMs": 2500,
  "tokensUsed": 450
}
```

**Error Responses**:
- `400 Bad Request` - Input text too short (<1000) or too long (>10000)
- `401 Unauthorized` - Not authenticated
- `429 Too Many Requests` - Daily generation limit exceeded (2 per day)
- `500 Internal Server Error` - AI API error
- `503 Service Unavailable` - AI API timeout (>30s)

### 15.5 Data Flow

1. Verify authentication
2. Validate input text (1000-10000 chars)
3. **Check rate limit**:
   - Query user profile
   - If `last_generation_date` = today AND `daily_generation_count` >= 2 → return 429
   - If `last_generation_date` != today → reset counter to 0
4. Call OpenRouter.ai API:
   - Model: anthropic/claude-3-5-sonnet (or specified)
   - Prompt: System message + input text + instructions
   - Timeout: 30 seconds
   - Retry: 2 attempts
5. Parse AI response (expected JSON array of {front, back})
6. Generate temp UUIDs for each card
7. Create generation session record:
   ```typescript
   {
     user_id: user.id,
     input_text: inputText,
     generated_count: cards.length,
     status: 'success',
     generation_time_ms: elapsed,
     tokens_used: usage.total_tokens,
     model_used: model
   }
   ```
8. Update profile: increment `daily_generation_count`, set `last_generation_date`
9. Return generated cards with session ID

### 15.6 AI Prompt Structure

```
System: You are a flashcard generation assistant. Generate high-quality question-answer pairs from the provided text.

User: {inputText}

Instructions:
- Generate 5-10 flashcards
- Questions should be clear and concise (max 200 chars)
- Answers should be complete but not overly verbose (max 500 chars)
- Focus on key concepts and facts
- Return ONLY valid JSON: [{"front": "question", "back": "answer"}]
- Do not include any markdown or explanatory text
```

### 15.7 Validation Rules

- inputText: required, 1000-10000 characters
- model: optional string, default 'anthropic/claude-3-5-sonnet'
- Trim whitespace before validation

### 15.8 Rate Limiting Logic

```typescript
const today = new Date().toISOString().split('T')[0];
if (profile.last_generation_date === today && profile.daily_generation_count >= 2) {
  return 429; // Too Many Requests
}

// Reset counter if new day
if (profile.last_generation_date !== today) {
  await updateProfile({ daily_generation_count: 0 });
}
```

### 15.9 Error Handling

| Scenario | HTTP Status | Error Code | Action |
|----------|-------------|------------|--------|
| Input too short | 400 | VALIDATION_ERROR | Return error |
| Input too long | 400 | VALIDATION_ERROR | Return error |
| Rate limit hit | 429 | RATE_LIMIT_EXCEEDED | Return with retry-after header |
| AI API timeout | 503 | SERVICE_UNAVAILABLE | Retry once, then return error |
| AI API error | 500 | INTERNAL_ERROR | Log error, create session with status='failed' |
| Invalid AI response | 500 | INTERNAL_ERROR | Parse as partial if possible, else failed |

### 15.10 Performance Considerations

- AI call: typically 2-5 seconds
- Maximum wait: 30 seconds (timeout)
- Database writes: 2 (generation_sessions + profiles)
- Consider async processing for large texts

### 15.11 Security Considerations

- **API Key Security**: Store OpenRouter API key in env vars (not `PUBLIC_`)
- **Input Sanitization**: Escape HTML in generated cards
- **Cost Control**: Rate limiting prevents API abuse
- **PII Protection**: Don't log input_text (may contain sensitive data)

### 15.12 Implementation Steps

1. **Create OpenRouter service** (`src/lib/services/openrouterService.ts`)
   ```typescript
   export async function generateFlashcards(inputText: string, model?: string): Promise<GeneratedCard[]>
   ```

2. **Create generation service** (`src/lib/services/generationService.ts`)
   ```typescript
   export async function generateFromText(userId: string, data: GenerateFlashcardsRequest)
   ```

3. **Implement rate limiting check**
   ```typescript
   function checkRateLimit(profile: Profile): boolean
   ```

4. **Create API route**
   - Validate input
   - Check rate limit
   - Call OpenRouter
   - Save session
   - Update profile
   - Return response

5. **Add error handling**
   - Wrap AI call in try-catch
   - Handle timeouts
   - Create failed session on error
   - Log errors (without PII)

---

## 16. POST /api/generate/[sessionId]/accept - Accept Generated Cards

### 16.1 Overview
Saves selected AI-generated flashcards to the user's collection and updates session statistics.

### 16.2 Request Details

**HTTP Method**: POST  
**File Path**: `/src/pages/api/generate/[sessionId]/accept.ts`  
**Authentication**: Required

**URL Parameters**: `sessionId` (generation session UUID)

**Request Body**:
```json
{
  "cards": [
    {
      "id": "temp_uuid_1",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is a powerful, open source object-relational database system..."
    },
    {
      "id": "temp_uuid_2",
      "front": "What language does PostgreSQL use? (edited)",
      "back": "PostgreSQL uses and extends the SQL language..."
    }
  ]
}
```

### 16.3 Utilized Types

- `AcceptCardsRequest`
- `AcceptCardsResponse`
- `GeneratedCard`
- `FlashcardResponse`
- `CreateAIFlashcardCommand` (internal)

### 16.4 Response Details

**Success (201 Created)**:
```json
{
  "sessionId": "uuid",
  "acceptedCount": 2,
  "rejectedCount": 3,
  "flashcards": [
    {
      "id": "uuid",
      "userId": "uuid",
      "generationSessionId": "uuid",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is...",
      "source": "ai_generated",
      "easeFactor": 2.5,
      "intervalDays": 0,
      "repetitions": 0,
      "nextReviewDate": "2025-10-26T10:00:00Z",
      "lastReviewedAt": null,
      "createdAt": "2025-10-26T10:00:00Z",
      "updatedAt": "2025-10-26T10:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request` - Validation errors (card content invalid)
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Session not found or doesn't belong to user

### 16.5 Data Flow

1. Verify authentication
2. Validate session exists and belongs to user
3. Validate cards array (each card must have front and back)
4. Calculate rejection count:
   ```typescript
   rejectedCount = session.generated_count - cards.length
   ```
5. Insert flashcards in batch:
   ```typescript
   flashcards.map(card => ({
     user_id: user.id,
     generation_session_id: sessionId,
     front: card.front.trim(),
     back: card.back.trim(),
     source: 'ai_generated'
   }))
   ```
6. Update generation session:
   ```typescript
   {
     accepted_count: cards.length,
     rejected_count: rejectedCount
   }
   ```
7. Database triggers update profile statistics
8. Return created flashcards

### 16.6 Validation Rules

- cards: required array, min 0, max = session.generated_count
- Each card:
  - front: required, 1-1000 chars
  - back: required, 1-2000 chars
- User can edit cards before accepting
- Accepting 0 cards is valid (reject all)

### 16.7 Business Logic

- **Acceptance Rate Calculation**: Used for metrics (target: 75%)
  ```typescript
  rate = (accepted_count / generated_count) * 100
  ```
- **Session Immutability**: Once accepted_count is set, session cannot be modified again

### 16.8 Performance Considerations

- Bulk insert for performance (single query)
- Transaction: ensure all cards saved or none
- Response time: ~100-200ms

### 16.9 Implementation Steps

1. Add to generationService: `acceptCards(userId, sessionId, cards)`
2. Create nested route file
3. Verify session ownership
4. Validate cards
5. Bulk insert flashcards
6. Update session
7. Return created cards with counts

---

# GENERATION SESSION ENDPOINTS

## 17. GET /api/sessions - List Generation Sessions

### 17.1 Overview
Returns paginated list of user's generation sessions with filtering.

### 17.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/sessions/index.ts`  
**Authentication**: Required

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)
- `status` (optional) - Filter: `success`, `failed`, or `partial`

### 17.3 Utilized Types

- `GenerationSessionsListParams`
- `GenerationSessionsListResponse`
- `GenerationSessionResponse`

### 17.4 Response Details

**Success (200 OK)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "inputText": "PostgreSQL is a powerful, open source...",
      "generatedCount": 5,
      "acceptedCount": 4,
      "rejectedCount": 1,
      "status": "success",
      "errorMessage": null,
      "generationTimeMs": 2500,
      "tokensUsed": 450,
      "modelUsed": "anthropic/claude-3-5-sonnet",
      "createdAt": "2025-10-26T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

### 17.5 Data Flow

1. Verify authentication
2. Parse query parameters
3. Query generation_sessions table:
   - Filter by user_id (RLS)
   - Apply status filter if provided
   - Sort by created_at DESC
   - Apply pagination
4. Get total count
5. Transform and return

### 17.6 Validation Rules

- status: must be 'success', 'failed', or 'partial' if provided
- Other params same as flashcards list

### 17.7 Implementation Steps

1. Add to generationService: `listSessions(userId, params)`
2. Create API route
3. Build query with filters
4. Return paginated response

---

## 18. GET /api/sessions/[id] - Get Single Generation Session

### 18.1 Overview
Retrieves a single generation session with linked flashcards.

### 18.2 Request Details

**HTTP Method**: GET  
**File Path**: `/src/pages/api/sessions/[id].ts`  
**Authentication**: Required

**URL Parameters**: `id` (session UUID)

### 18.3 Utilized Types

- `GenerationSessionWithCards`

### 18.4 Response Details

**Success (200 OK)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "inputText": "PostgreSQL is a powerful, open source...",
  "generatedCount": 5,
  "acceptedCount": 4,
  "rejectedCount": 1,
  "status": "success",
  "errorMessage": null,
  "generationTimeMs": 2500,
  "tokensUsed": 450,
  "modelUsed": "anthropic/claude-3-5-sonnet",
  "createdAt": "2025-10-26T10:00:00Z",
  "flashcards": [
    {
      "id": "uuid",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is..."
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Session not found or doesn't belong to user

### 18.5 Data Flow

1. Verify authentication
2. Query generation_sessions by ID
3. Query linked flashcards (where generation_session_id = id)
4. Combine and return

### 18.6 Implementation Steps

1. Add to generationService: `getSession(id)`
2. Create dynamic route
3. Fetch session + flashcards
4. Return combined response

---

# SHARED IMPLEMENTATION DETAILS

## Service Architecture

### authService.ts
```typescript
import { supabase } from '../db/supabase';
import type { SignupRequest, LoginRequest, AuthResponse } from '../types';

export async function signUp(data: SignupRequest): Promise<AuthResponse> {
  // 1. Sign up with Supabase Auth
  // 2. Create profile
  // 3. Return auth response
}

export async function signIn(data: LoginRequest): Promise<AuthResponse> {
  // Call Supabase signInWithPassword
}

export async function signOut(): Promise<void> {
  // Call Supabase signOut
}
```

### profileService.ts
```typescript
import { supabase } from '../db/supabase';
import type { ProfileResponse, UpdateProfileRequest, UserStatsResponse } from '../types';

export async function getProfile(userId: string): Promise<ProfileResponse | null> {
  // Query profiles table, transform to camelCase
}

export async function updateProfile(userId: string, data: UpdateProfileRequest): Promise<ProfileResponse> {
  // Update profile, return updated data
}

export async function getUserStats(userId: string): Promise<UserStatsResponse> {
  // Call get_user_stats RPC function
}
```

### flashcardService.ts
```typescript
import { supabase } from '../db/supabase';
import type {
  FlashcardsListParams,
  FlashcardsListResponse,
  FlashcardResponse,
  CreateFlashcardRequest,
  UpdateFlashcardRequest,
  CardsDueResponse
} from '../types';

export async function listFlashcards(userId: string, params: FlashcardsListParams): Promise<FlashcardsListResponse> {
  // Build query with filters and pagination
}

export async function getFlashcard(id: string): Promise<FlashcardResponse | null> {
  // Get single flashcard
}

export async function createFlashcard(userId: string, data: CreateFlashcardRequest): Promise<FlashcardResponse> {
  // Insert manual flashcard
}

export async function updateFlashcard(id: string, data: UpdateFlashcardRequest): Promise<FlashcardResponse> {
  // Update flashcard
}

export async function deleteFlashcard(id: string): Promise<void> {
  // Delete flashcard
}

export async function getCardsDue(userId: string, limit: number): Promise<CardsDueResponse> {
  // Call get_cards_due_for_review RPC
}

export async function reviewCard(id: string, quality: number): Promise<FlashcardResponse> {
  // Call update_card_review RPC
}
```

### generationService.ts
```typescript
import { supabase } from '../db/supabase';
import type {
  GenerateFlashcardsRequest,
  GenerateFlashcardsResponse,
  AcceptCardsRequest,
  AcceptCardsResponse,
  GenerationSessionsListParams,
  GenerationSessionsListResponse,
  GenerationSessionWithCards
} from '../types';
import { generateFlashcardsWithAI } from './openrouterService';

export async function generateFromText(userId: string, data: GenerateFlashcardsRequest): Promise<GenerateFlashcardsResponse> {
  // 1. Check rate limit
  // 2. Call AI service
  // 3. Create session record
  // 4. Update profile
  // 5. Return generated cards
}

export async function acceptCards(userId: string, sessionId: string, data: AcceptCardsRequest): Promise<AcceptCardsResponse> {
  // 1. Verify session ownership
  // 2. Bulk insert flashcards
  // 3. Update session counts
  // 4. Return created cards
}

export async function listSessions(userId: string, params: GenerationSessionsListParams): Promise<GenerationSessionsListResponse> {
  // List with pagination
}

export async function getSession(id: string): Promise<GenerationSessionWithCards | null> {
  // Get session with flashcards
}
```

### openrouterService.ts
```typescript
export async function generateFlashcardsWithAI(
  inputText: string,
  model: string = 'anthropic/claude-3-5-sonnet'
): Promise<{ cards: GeneratedCard[], tokensUsed: number, timeMs: number }> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: inputText }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  
  // Parse response, generate temp UUIDs, return cards
}

const SYSTEM_PROMPT = `You are a flashcard generation assistant...`;
```

### validationService.ts
```typescript
import { z } from 'zod';

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().max(100).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Profile schemas
export const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional()
});

// Flashcard schemas
export const createFlashcardSchema = z.object({
  front: z.string().min(1).max(1000).transform(s => s.trim()),
  back: z.string().min(1).max(2000).transform(s => s.trim())
});

export const updateFlashcardSchema = z.object({
  front: z.string().min(1).max(1000).transform(s => s.trim()).optional(),
  back: z.string().min(1).max(2000).transform(s => s.trim()).optional()
}).refine(data => data.front || data.back, {
  message: 'At least one field must be provided'
});

export const reviewCardSchema = z.object({
  quality: z.number().int().min(0).max(5)
});

// Generation schemas
export const generateSchema = z.object({
  inputText: z.string().min(1000).max(10000).transform(s => s.trim()),
  model: z.string().optional()
});

export const acceptCardsSchema = z.object({
  cards: z.array(z.object({
    id: z.string().uuid(),
    front: z.string().min(1).max(1000).transform(s => s.trim()),
    back: z.string().min(1).max(2000).transform(s => s.trim())
  }))
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const flashcardsListSchema = paginationSchema.extend({
  source: z.enum(['ai_generated', 'manual']).optional(),
  sort: z.string().regex(/^(created_at|updated_at|front|next_review_date):(asc|desc)$/).default('created_at:desc')
});

export const sessionsListSchema = paginationSchema.extend({
  status: z.enum(['success', 'failed', 'partial']).optional()
});
```

## API Route Template

```typescript
// src/pages/api/[resource]/[...path].ts
import type { APIRoute } from 'astro';
import { supabase } from '../../../db/supabase';
import { someService } from '../../../lib/services/someService';
import { someSchema } from '../../../lib/services/validationService';

export const prerender = false;

export const GET: APIRoute = async ({ request, params, url, locals }) => {
  // 1. Authentication check
  const { data: { user }, error: authError } = await locals.supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 2. Extract and validate parameters
    const queryParams = Object.fromEntries(url.searchParams);
    const validation = someSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.flatten()
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Call service
    const result = await someService(user.id, validation.data);

    // 4. Return response
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  // Similar structure for POST
  // Parse JSON body: await request.json()
};
```

## Error Logging Strategy

Create error logging utility:

```typescript
// src/lib/utils/errorLogger.ts
export function logError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  const errorData = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    metadata
  };

  // In development: console.error
  console.error('API Error:', JSON.stringify(errorData, null, 2));

  // In production: send to error tracking service (Sentry, etc.)
  if (import.meta.env.PROD) {
    // Sentry.captureException(error, { contexts: { custom: errorData } });
  }
}
```

## Testing Strategy

1. **Unit Tests** (services):
   - Test each service function
   - Mock Supabase client
   - Test validation schemas

2. **Integration Tests** (API routes):
   - Test complete request/response cycle
   - Use test database
   - Test authentication flow

3. **E2E Tests**:
   - Test user flows (signup → create card → review)
   - Use Playwright or Cypress

## Deployment Checklist

- [ ] All services implemented
- [ ] All API routes created
- [ ] Zod validation schemas complete
- [ ] Error handling in place
- [ ] RLS policies verified
- [ ] Environment variables set
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] Error logging configured
- [ ] API documentation updated
- [ ] Tests written and passing

---

## Implementation Priority

**Phase 1: Authentication & Profile (Week 1)**
1. POST /api/auth/signup
2. POST /api/auth/login
3. POST /api/auth/logout
4. GET /api/auth/user
5. GET /api/profile
6. PATCH /api/profile
7. GET /api/profile/stats

**Phase 2: Flashcard CRUD (Week 2)**
8. GET /api/flashcards (list)
9. GET /api/flashcards/[id]
10. POST /api/flashcards
11. PATCH /api/flashcards/[id]
12. DELETE /api/flashcards/[id]

**Phase 3: Review System (Week 2-3)**
13. GET /api/flashcards/due
14. POST /api/flashcards/[id]/review

**Phase 4: AI Generation (Week 3-4)**
15. POST /api/generate
16. POST /api/generate/[sessionId]/accept
17. GET /api/sessions
18. GET /api/sessions/[id]

**Phase 5: Polish & Testing (Week 4)**
- Error handling refinement
- Rate limiting implementation
- Performance optimization
- Security audit
- Documentation updates

---

## Success Metrics Tracking

Implement analytics for PRD metrics:

```typescript
// src/lib/utils/analytics.ts
export async function trackMetric(metric: string, value: number, userId: string) {
  // Track in database or analytics service
  // Example metrics:
  // - ai_acceptance_rate
  // - ai_usage_rate
  // - daily_active_users
  // - average_cards_per_user
}
```

Query for metrics:

```sql
-- AI Acceptance Rate (target: 75%)
SELECT 
  ROUND((SUM(accepted_count)::DECIMAL / SUM(generated_count)::DECIMAL) * 100, 2) AS acceptance_rate
FROM generation_sessions 
WHERE status = 'success';

-- AI Usage Rate (target: 75%)
SELECT 
  COUNT(*) FILTER (WHERE source = 'ai_generated')::DECIMAL / COUNT(*)::DECIMAL * 100 AS ai_usage_percentage
FROM flashcards;
```

---

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-10-26
- **Status**: Active (Implementation Guide)
- **Next Review**: After Phase 1 completion

---

## Additional Resources

- **API Plan**: `.ai/api-plan.md`
- **Database Schema**: `.ai/database-schema.md`
- **Type Definitions**: `src/types.ts`
- **Supabase Config**: `supabase/config.toml`
- **Migration Files**: `supabase/migrations/`

