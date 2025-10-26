# REST API Plan - 10xCards

## Overview

This API plan provides a comprehensive RESTful interface for the 10xCards application, enabling AI-powered flashcard generation, manual flashcard management, and spaced repetition learning sessions. The API is built on Astro 5 with Supabase as the backend service, leveraging PostgreSQL with Row Level Security (RLS) for data isolation and OpenRouter.ai for AI model integration.

## 1. Resources

### Primary Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| **User Profiles** | `profiles` | Extended user information and statistics |
| **Flashcards** | `flashcards` | User-created and AI-generated flashcards with SM-2 metadata |
| **Generation Sessions** | `generation_sessions` | Immutable audit log of AI generation attempts |
| **Review Sessions** | N/A (computed) | Dynamic learning sessions based on spaced repetition |

## 2. API Endpoints

### 2.1 Authentication

Authentication is handled by Supabase Auth. All authenticated endpoints require a valid JWT token in the Authorization header.

#### Register User
```http
POST /api/auth/signup
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

**Success Response (201 Created):**
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

**Error Responses:**
- `400 Bad Request` - Invalid email format or password too weak
- `409 Conflict` - User already exists

---

#### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**
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

**Error Responses:**
- `401 Unauthorized` - Invalid credentials

---

#### Logout User
```http
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (204 No Content)**

---

#### Get Current User
```http
GET /api/auth/user
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
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

**Error Responses:**
- `401 Unauthorized` - Invalid or expired token

---

### 2.2 User Profile

#### Get User Profile
```http
GET /api/profile
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
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

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Profile not found

---

#### Update User Profile
```http
PATCH /api/profile
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "displayName": "Jane Doe"
}
```

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "displayName": "Jane Doe",
  "totalCardsCreated": 45,
  "totalCardsGeneratedByAI": 30,
  "dailyGenerationCount": 2,
  "lastGenerationDate": "2025-10-26",
  "updatedAt": "2025-10-26T15:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid display name (empty or > 100 chars)

---

#### Get User Statistics
```http
GET /api/profile/stats
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
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

**Error Responses:**
- `401 Unauthorized` - Not authenticated

---

### 2.3 Flashcards

#### List User Flashcards
```http
GET /api/flashcards
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Items per page
- `source` (optional) - Filter by source: `ai_generated` or `manual`
- `sort` (optional, default: `created_at:desc`) - Sort field and direction

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "generationSessionId": "uuid",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is a powerful, open source object-relational database system...",
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

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid query parameters

---

#### Get Single Flashcard
```http
GET /api/flashcards/{id}
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "generationSessionId": "uuid",
  "front": "What is PostgreSQL?",
  "back": "PostgreSQL is a powerful, open source object-relational database system...",
  "source": "ai_generated",
  "easeFactor": 2.5,
  "intervalDays": 0,
  "repetitions": 0,
  "nextReviewDate": "2025-10-26T10:00:00Z",
  "lastReviewedAt": null,
  "createdAt": "2025-10-26T10:00:00Z",
  "updatedAt": "2025-10-26T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user

---

#### Create Flashcard (Manual)
```http
POST /api/flashcards
```

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "front": "What is the capital of France?",
  "back": "Paris"
}
```

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "generationSessionId": null,
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "easeFactor": 2.5,
  "intervalDays": 0,
  "repetitions": 0,
  "nextReviewDate": "2025-10-26T10:00:00Z",
  "lastReviewedAt": null,
  "createdAt": "2025-10-26T10:00:00Z",
  "updatedAt": "2025-10-26T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Validation errors:
  - Front text empty or > 1000 characters
  - Back text empty or > 2000 characters

---

#### Update Flashcard
```http
PATCH /api/flashcards/{id}
```

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "front": "Updated question?",
  "back": "Updated answer"
}
```

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "generationSessionId": null,
  "front": "Updated question?",
  "back": "Updated answer",
  "source": "manual",
  "easeFactor": 2.5,
  "intervalDays": 0,
  "repetitions": 0,
  "nextReviewDate": "2025-10-26T10:00:00Z",
  "lastReviewedAt": null,
  "createdAt": "2025-10-26T10:00:00Z",
  "updatedAt": "2025-10-26T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user
- `400 Bad Request` - Validation errors

---

#### Delete Flashcard
```http
DELETE /api/flashcards/{id}
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (204 No Content)**

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user

---

#### Get Cards Due for Review
```http
GET /api/flashcards/due
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `limit` (optional, default: 20, max: 100) - Maximum cards to return

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is a powerful, open source object-relational database system...",
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

**Error Responses:**
- `401 Unauthorized` - Not authenticated

---

#### Review Flashcard (SM-2 Algorithm)
```http
POST /api/flashcards/{id}/review
```

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "quality": 4
}
```

**Quality Scale:**
- `0` - Complete blackout
- `1` - Incorrect response, but correct answer seemed familiar
- `2` - Incorrect response, but correct answer seemed easy to recall
- `3` - Correct response, but required significant difficulty to recall
- `4` - Correct response, after some hesitation
- `5` - Perfect response

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "generationSessionId": "uuid",
  "front": "What is PostgreSQL?",
  "back": "PostgreSQL is a powerful, open source object-relational database system...",
  "source": "ai_generated",
  "easeFactor": 2.6,
  "intervalDays": 1,
  "repetitions": 1,
  "nextReviewDate": "2025-10-27T10:30:00Z",
  "lastReviewedAt": "2025-10-26T10:30:00Z",
  "createdAt": "2025-10-26T10:00:00Z",
  "updatedAt": "2025-10-26T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Flashcard not found or doesn't belong to user
- `400 Bad Request` - Invalid quality value (must be 0-5)

---

### 2.4 AI Generation

#### Generate Flashcards from Text
```http
POST /api/generate
```

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "inputText": "PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance. It uses and extends the SQL language combined with many features that safely store and scale the most complicated data workloads...",
  "model": "anthropic/claude-3-5-sonnet"
}
```

**Validation:**
- `inputText` must be between 1,000 and 10,000 characters
- `model` (optional) - defaults to configured model

**Success Response (200 OK):**
```json
{
  "sessionId": "uuid",
  "status": "success",
  "generatedCards": [
    {
      "id": "temp_uuid_1",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development, known for reliability, feature robustness, and performance."
    },
    {
      "id": "temp_uuid_2",
      "front": "What language does PostgreSQL use?",
      "back": "PostgreSQL uses and extends the SQL language combined with many features that safely store and scale complicated data workloads."
    }
  ],
  "generatedCount": 5,
  "generationTimeMs": 2500,
  "tokensUsed": 450
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Validation errors:
  - Input text too short (< 1000 chars)
  - Input text too long (> 10000 chars)
- `429 Too Many Requests` - Daily generation limit exceeded
- `500 Internal Server Error` - AI API error
- `503 Service Unavailable` - AI API timeout

---

#### Accept Generated Flashcards
```http
POST /api/generate/{sessionId}/accept
```

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "cards": [
    {
      "id": "temp_uuid_1",
      "front": "What is PostgreSQL?",
      "back": "PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development, known for reliability, feature robustness, and performance."
    },
    {
      "id": "temp_uuid_2",
      "front": "What language does PostgreSQL use? (edited)",
      "back": "PostgreSQL uses and extends the SQL language combined with many features that safely store and scale complicated data workloads."
    }
  ]
}
```

**Success Response (201 Created):**
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
      "back": "PostgreSQL is a powerful, open source object-relational database system...",
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

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Generation session not found or doesn't belong to user
- `400 Bad Request` - Validation errors on card content

---

### 2.5 Generation Sessions

#### List Generation Sessions
```http
GET /api/sessions
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Items per page
- `status` (optional) - Filter by status: `success`, `failed`, or `partial`

**Success Response (200 OK):**
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

**Error Responses:**
- `401 Unauthorized` - Not authenticated

---

#### Get Single Generation Session
```http
GET /api/sessions/{id}
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "inputText": "PostgreSQL is a powerful, open source object-relational database system...",
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
      "back": "PostgreSQL is a powerful, open source object-relational database system..."
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Session not found or doesn't belong to user

---

## 3. Authentication & Authorization

### Authentication Method

The API uses **Supabase Auth** with JWT tokens for authentication:

1. **Registration/Login**: Users authenticate via `/api/auth/signup` or `/api/auth/login`
2. **Token Management**: Supabase returns an `access_token` (JWT) and `refresh_token`
3. **Token Usage**: Include the access token in the Authorization header:
   ```
   Authorization: Bearer {access_token}
   ```
4. **Token Refresh**: Tokens expire after 1 hour (configurable). Use refresh token to obtain new access token
5. **Session Management**: Supabase SDK handles automatic token refresh

### Authorization Strategy

Authorization is implemented using **Row Level Security (RLS)** at the database level:

1. **User Isolation**: All queries automatically filtered by `auth.uid()` via RLS policies
2. **Resource Ownership**: Users can only access their own resources
3. **Policy Enforcement**:
   - `profiles`: Users can view/update only their own profile
   - `flashcards`: Full CRUD access only to owned cards
   - `generation_sessions`: View and insert only; no updates/deletes (immutable audit log)

### Security Considerations

1. **API Key Security**:
   - Use `PUBLIC_SUPABASE_ANON_KEY` for client-side requests (respects RLS)
   - Never expose `service_role` key in client code

2. **Rate Limiting**:
   - Generation endpoint: 2 requests per day per user (enforced via `daily_generation_count`)
   - Reset daily counter at midnight

3. **Input Validation**:
   - All inputs validated against database constraints
   - Text length limits enforced
   - Quality values constrained to 0-5 range

4. **CORS Policy**:
   - Configure CORS to allow only trusted origins
   - In production: whitelist specific domains

---

## 4. Validation & Business Logic

### 4.1 User Profile Validation

| Field | Validation Rules |
|-------|-----------------|
| `displayName` | Optional; max 100 characters |
| `totalCardsCreated` | Auto-calculated; non-negative |
| `totalCardsGeneratedByAI` | Auto-calculated; ≤ totalCardsCreated |
| `dailyGenerationCount` | Auto-calculated; non-negative |

**Business Logic:**
- Profile statistics automatically updated via database triggers
- Daily generation count resets at midnight (checked during generation request)

---

### 4.2 Flashcard Validation

| Field | Validation Rules |
|-------|-----------------|
| `front` | Required; 1-1000 characters |
| `back` | Required; 1-2000 characters |
| `easeFactor` | ≥ 1.3; default 2.5 |
| `intervalDays` | ≥ 0; default 0 |
| `repetitions` | ≥ 0; default 0 |
| `nextReviewDate` | ≥ createdAt |

**Business Logic:**
- **SM-2 Algorithm**: Implemented in `update_card_review()` database function
  - Quality ≥ 3: Increase interval and ease factor
  - Quality < 3: Reset to day 1
  - Ease factor minimum: 1.3
- **Statistics Update**: Triggers automatically update profile counts on insert/delete/update
- **Source Tracking**: Cards marked as `ai_generated` or `manual`

---

### 4.3 Generation Session Validation

| Field | Validation Rules |
|-------|-----------------|
| `inputText` | Required; 1000-10000 characters |
| `generatedCount` | ≥ 0 |
| `acceptedCount` | ≤ generatedCount |
| `rejectedCount` | ≤ generatedCount |
| `acceptedCount + rejectedCount` | ≤ generatedCount |

**Business Logic:**
- **Rate Limiting**: Max 2 generation sessions per day per user
  - Tracked via `profiles.daily_generation_count`
  - Reset when `profiles.last_generation_date` ≠ current date
- **Immutability**: Sessions cannot be updated or deleted (audit trail)
- **Status Tracking**: `success`, `failed`, or `partial`
- **Acceptance Flow**:
  1. Generate cards (creates session with status `success`)
  2. User reviews and edits proposed cards
  3. Accept selected cards (updates `acceptedCount` and `rejectedCount`)
  4. Accepted cards saved as flashcards with `generationSessionId` link

---

### 4.4 Review Session Business Logic

**SM-2 Spaced Repetition Algorithm:**

1. **Quality Rating (0-5)**:
   - 0-2: Incorrect → Reset card (repetitions=0, interval=1 day)
   - 3-5: Correct → Progress card

2. **Ease Factor Calculation** (quality ≥ 3):
   ```
   newEF = oldEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
   minimum EF = 1.3
   ```

3. **Interval Calculation** (quality ≥ 3):
   - 1st repetition: 1 day
   - 2nd repetition: 6 days
   - 3rd+ repetition: previous_interval × ease_factor

4. **Next Review Date**:
   ```
   next_review = current_time + interval_days
   ```

---

## 5. Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context or field-specific errors"
    }
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input data |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate email) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | External service unavailable |

---

## 6. API Versioning

- **Current Version**: v1 (implicit)
- **Future Versioning**: If breaking changes required, use URL versioning: `/api/v2/...`
- **Deprecation Policy**: 6-month notice for deprecated endpoints

---

## 7. Performance Considerations

### Pagination
- Default: 20 items per page
- Maximum: 100 items per page
- Use `page` and `limit` query parameters

### Caching Strategy
- User profile: Cache for 5 minutes
- Flashcard lists: Cache for 1 minute
- Due cards: No caching (real-time)

### Database Optimization
- Indexes on frequently queried fields:
  - `flashcards(user_id, next_review_date)`
  - `flashcards(user_id, created_at)`
  - `generation_sessions(user_id, created_at)`
- Full-text search on `generation_sessions.input_text`

---

## 8. Success Metrics Tracking

Per PRD requirements, track the following metrics:

1. **AI Acceptance Rate**:
   - Calculated: `(acceptedCount / generatedCount) × 100`
   - Target: ≥ 75%
   - Available via: `/api/profile/stats`

2. **AI Usage Rate**:
   - Calculated: `(totalCardsGeneratedByAI / totalCardsCreated) × 100`
   - Target: ≥ 75%
   - Available via: `/api/profile/stats`

3. **Generation Session Analytics**:
   - Total sessions
   - Success rate
   - Average generation time
   - Token usage (for cost analysis)

---

## 9. Future Enhancements (Out of MVP Scope)

The following features are explicitly out of scope for MVP but documented for future consideration:

1. **Shared Flashcard Decks**: Endpoints for public/shared flashcard collections
2. **Import/Export**: Bulk operations for flashcard data (PDF, DOCX, CSV)
3. **Advanced Search**: Full-text search across flashcard content
4. **Gamification**: Points, streaks, achievements
5. **Public API**: OAuth2-based public API for third-party integrations
6. **Webhook Notifications**: Real-time updates for learning reminders
7. **Batch Operations**: Bulk update/delete operations
8. **Analytics Dashboard**: Detailed learning analytics and visualizations

---

## 10. Implementation Notes

### Astro API Routes

All endpoints implemented as Astro API routes in `/src/pages/api/`:

```typescript
// Example: /src/pages/api/flashcards/index.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, url }) => {
  const { supabase } = locals;
  const user = await supabase.auth.getUser();
  
  if (!user.data.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    });
  }
  
  // Implementation...
};
```

### Type Safety

Use generated TypeScript types from `/src/db/types.ts`:

```typescript
import type { Flashcard, FlashcardInsert } from '../db/types';
```

### Zod Validation

All request bodies validated using Zod schemas:

```typescript
import { z } from 'zod';

const createFlashcardSchema = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(2000)
});
```

---

## Appendix A: Database Functions

The following PostgreSQL functions are used by the API:

1. **`update_card_review(card_uuid, quality)`**
   - Implements SM-2 algorithm
   - Returns updated flashcard
   - Used by: `POST /api/flashcards/{id}/review`

2. **`get_cards_due_for_review(user_uuid, limit_count)`**
   - Returns cards where `next_review_date <= NOW()`
   - Ordered by review date
   - Used by: `GET /api/flashcards/due`

3. **`get_user_stats(user_uuid)`**
   - Returns comprehensive user statistics
   - Used by: `GET /api/profile/stats`

4. **Automatic Triggers**:
   - `update_profile_stats()`: Auto-update card counts
   - `update_updated_at_column()`: Auto-update timestamps

---

## Appendix B: OpenRouter.ai Integration

### AI Model Configuration

**Default Model**: `anthropic/claude-3-5-sonnet`

**Generation Prompt Structure**:
```
System: You are a flashcard generation assistant. Generate high-quality question-answer pairs from the provided text.

User: {inputText}

Instructions:
- Generate 5-10 flashcards
- Questions should be clear and concise
- Answers should be complete but not overly verbose
- Focus on key concepts and facts
- Return JSON format: [{"front": "...", "back": "..."}]
```

**Error Handling**:
- Timeout: 30 seconds
- Retry logic: 2 attempts
- Fallback: Return partial results if available

---

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-10-26
- **Status**: Active (MVP)

