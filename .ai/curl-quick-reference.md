# 10xCards API - Quick CURL Reference

Complete reference of all 18 REST API endpoints with copy-paste ready curl commands.

## Prerequisites

```bash
# 1. Start Supabase locally
npx supabase start

# 2. Start Astro dev server
npm run dev

# 3. Set your base URL and token
BASE_URL="http://localhost:4321"
ACCESS_TOKEN="your_token_here"  # Get from login response
```

---

## 1️⃣ AUTHENTICATION (4 endpoints)

### 1. POST /api/auth/signup - Register User

```bash
curl -X POST "${BASE_URL}/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "displayName": "Test User"
  }'
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com"
  },
  "session": {
    "accessToken": "jwt_token...",
    "refreshToken": "refresh_token...",
    "expiresIn": 3600
  }
}
```

---

### 2. POST /api/auth/login - Login User

```bash
curl -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

**Expected Response (200):**
```json
{
  "user": { "id": "uuid", "email": "test@example.com" },
  "session": { "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }
}
```

💡 **Save the accessToken for subsequent requests!**

---

### 3. GET /api/auth/user - Get Current User

```bash
curl -X GET "${BASE_URL}/api/auth/user" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):**
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "profile": {
    "displayName": "Test User",
    "totalCardsCreated": 0,
    "totalCardsGeneratedByAI": 0,
    "dailyGenerationCount": 0,
    "lastGenerationDate": null
  }
}
```

---

### 4. POST /api/auth/logout - Logout User

```bash
curl -X POST "${BASE_URL}/api/auth/logout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (204 No Content)**

---

## 2️⃣ USER PROFILE (3 endpoints)

### 5. GET /api/profile - Get User Profile

```bash
curl -X GET "${BASE_URL}/api/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "displayName": "Test User",
  "totalCardsCreated": 0,
  "totalCardsGeneratedByAI": 0,
  "dailyGenerationCount": 0,
  "lastGenerationDate": null,
  "createdAt": "2025-10-26T10:00:00Z",
  "updatedAt": "2025-10-26T10:00:00Z"
}
```

---

### 6. PATCH /api/profile - Update User Profile

```bash
curl -X PATCH "${BASE_URL}/api/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Updated Name"
  }'
```

**Expected Response (200):** Updated profile object

---

### 7. GET /api/profile/stats - Get User Statistics

```bash
curl -X GET "${BASE_URL}/api/profile/stats" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):**
```json
{
  "totalCardsCreated": 10,
  "totalCardsGeneratedByAI": 8,
  "cardsDueToday": 3,
  "totalReviewsCompleted": 5,
  "totalGenerationSessions": 2,
  "totalAcceptedCards": 8,
  "averageAcceptanceRate": 80.0,
  "dailyGenerationCount": 1,
  "lastGenerationDate": "2025-10-26"
}
```

---

## 3️⃣ FLASHCARDS - CRUD (5 endpoints)

### 8. POST /api/flashcards - Create Flashcard

```bash
curl -X POST "${BASE_URL}/api/flashcards" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "front": "What is the capital of France?",
    "back": "Paris is the capital and largest city of France."
  }'
```

**Expected Response (201):**
```json
{
  "id": "flashcard_uuid",
  "userId": "uuid",
  "generationSessionId": null,
  "front": "What is the capital of France?",
  "back": "Paris is the capital and largest city of France.",
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

---

### 9. GET /api/flashcards - List User Flashcards

```bash
# Default (page 1, limit 20)
curl -X GET "${BASE_URL}/api/flashcards" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# With pagination
curl -X GET "${BASE_URL}/api/flashcards?page=2&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# With source filter
curl -X GET "${BASE_URL}/api/flashcards?source=manual" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# With sorting
curl -X GET "${BASE_URL}/api/flashcards?sort=created_at:asc" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Combined
curl -X GET "${BASE_URL}/api/flashcards?page=1&limit=5&source=ai_generated&sort=created_at:desc" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):**
```json
{
  "data": [/* flashcard objects */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 10. GET /api/flashcards/[id] - Get Single Flashcard

```bash
FLASHCARD_ID="your_flashcard_uuid"

curl -X GET "${BASE_URL}/api/flashcards/${FLASHCARD_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):** Single flashcard object

---

### 11. PATCH /api/flashcards/[id] - Update Flashcard

```bash
FLASHCARD_ID="your_flashcard_uuid"

curl -X PATCH "${BASE_URL}/api/flashcards/${FLASHCARD_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "front": "Updated question?",
    "back": "Updated answer"
  }'
```

**Expected Response (200):** Updated flashcard object

---

### 12. DELETE /api/flashcards/[id] - Delete Flashcard

```bash
FLASHCARD_ID="your_flashcard_uuid"

curl -X DELETE "${BASE_URL}/api/flashcards/${FLASHCARD_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (204 No Content)**

---

## 4️⃣ FLASHCARDS - REVIEW SYSTEM (2 endpoints)

### 13. GET /api/flashcards/due - Get Cards Due for Review

```bash
# Default limit (20)
curl -X GET "${BASE_URL}/api/flashcards/due" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Custom limit
curl -X GET "${BASE_URL}/api/flashcards/due?limit=5" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):**
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

---

### 14. POST /api/flashcards/[id]/review - Review Flashcard

```bash
FLASHCARD_ID="your_flashcard_uuid"

# Quality 5: Perfect response
curl -X POST "${BASE_URL}/api/flashcards/${FLASHCARD_ID}/review" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "quality": 5
  }'

# Quality 4: Correct after hesitation
curl -X POST "${BASE_URL}/api/flashcards/${FLASHCARD_ID}/review" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"quality": 4}'

# Quality 0: Complete blackout
curl -X POST "${BASE_URL}/api/flashcards/${FLASHCARD_ID}/review" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"quality": 0}'
```

**Quality Scale:**
- 0: Complete blackout
- 1: Incorrect, but answer seemed familiar
- 2: Incorrect, but easy to recall
- 3: Correct with difficulty
- 4: Correct after hesitation
- 5: Perfect response

**Expected Response (200):** Updated flashcard with new SM-2 parameters

---

## 5️⃣ AI GENERATION (4 endpoints)

### 15. POST /api/generate - Generate Flashcards from Text

```bash
curl -X POST "${BASE_URL}/api/generate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "inputText": "PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance. It uses and extends the SQL language combined with many features that safely store and scale the most complicated data workloads. PostgreSQL has become the preferred open source relational database for many enterprise developers and start-ups, powering leading business and mobile applications. PostgreSQL comes with many features aimed to help developers build applications, administrators to protect data integrity and build fault-tolerant environments, and help you manage your data no matter how big or small the dataset. In addition to being free and open source, PostgreSQL is highly extensible. For example, you can define your own data types, build out custom functions, even write code from different programming languages without recompiling your database.",
    "model": "anthropic/claude-3-5-sonnet"
  }'
```

**Note:** Input text must be 1000-10000 characters

**Expected Response (200):**
```json
{
  "sessionId": "session_uuid",
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

**Rate Limit:** 2 generations per day per user

---

### 16. POST /api/generate/[sessionId]/accept - Accept Generated Cards

```bash
SESSION_ID="your_session_uuid"

curl -X POST "${BASE_URL}/api/generate/${SESSION_ID}/accept" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "cards": [
      {
        "id": "temp_uuid_1",
        "front": "What is PostgreSQL?",
        "back": "PostgreSQL is a powerful, open source object-relational database system."
      },
      {
        "id": "temp_uuid_2",
        "front": "How extensible is PostgreSQL? (edited by user)",
        "back": "PostgreSQL is highly extensible - you can define custom data types, functions, and write code from different programming languages."
      }
    ]
  }'
```

**Note:** 
- Use temp UUIDs from generate response
- You can edit front/back before accepting
- Accepting 0 cards (empty array) is valid (reject all)

**Expected Response (201):**
```json
{
  "sessionId": "session_uuid",
  "acceptedCount": 2,
  "rejectedCount": 3,
  "flashcards": [/* created flashcard objects with permanent UUIDs */]
}
```

---

### 17. GET /api/sessions - List Generation Sessions

```bash
# Default (page 1, limit 20)
curl -X GET "${BASE_URL}/api/sessions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# With pagination
curl -X GET "${BASE_URL}/api/sessions?page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# With status filter
curl -X GET "${BASE_URL}/api/sessions?status=success" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "inputText": "PostgreSQL is...",
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
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 }
}
```

---

### 18. GET /api/sessions/[id] - Get Single Generation Session

```bash
SESSION_ID="your_session_uuid"

curl -X GET "${BASE_URL}/api/sessions/${SESSION_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "inputText": "PostgreSQL is...",
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

---

## 🔧 Environment Setup

### Option 1: Export Variables

```bash
export BASE_URL="http://localhost:4321"
export ACCESS_TOKEN="your_token_here"
export FLASHCARD_ID="flashcard_uuid"
export SESSION_ID="session_uuid"
```

### Option 2: Source Test Script

```bash
# Source the test script
source .ai/curl-test-requests.sh

# Run individual tests
test_auth_login
test_flashcard_create
test_generate

# Run test suites
test_all_auth
test_all_flashcards
test_all
```

---

## 📊 Testing Workflow

**Complete Test Flow:**

1. **Setup**
   ```bash
   source .ai/curl-test-requests.sh
   ```

2. **Authentication**
   ```bash
   test_auth_signup  # Or login if already exists
   test_auth_login   # Saves ACCESS_TOKEN
   ```

3. **Profile Operations**
   ```bash
   test_profile_get
   test_profile_stats
   ```

4. **Flashcard Operations**
   ```bash
   test_flashcard_create  # Saves FLASHCARD_ID
   test_flashcards_list
   test_flashcard_review
   ```

5. **AI Generation** (requires OPENROUTER_API_KEY)
   ```bash
   test_generate  # Saves SESSION_ID
   test_sessions_list
   ```

---

## ⚠️ Common Issues

### 401 Unauthorized
- Make sure you're logged in and ACCESS_TOKEN is set
- Token expires after 1 hour - login again

### 429 Rate Limit Exceeded
- Generation endpoint: max 2 requests per day
- Wait until midnight or use different user

### 503 Service Unavailable (AI)
- OpenRouter.ai API timeout or error
- Check OPENROUTER_API_KEY environment variable
- Try with shorter input text

### 400 Validation Error
- Check request body format
- Verify field requirements (lengths, formats)
- Input text must be 1000-10000 chars for generation

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- UUIDs are in standard format (8-4-4-4-12)
- All responses use camelCase for consistency
- Error responses follow standard format:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable message",
      "details": {}
    }
  }
  ```

---

## 🎉 Happy Testing!

For more details, see:
- **Implementation Plan**: `.ai/api-implementation-plan.md`
- **API Spec**: `.ai/api-plan.md`
- **Database Schema**: `.ai/database-schema.md`

