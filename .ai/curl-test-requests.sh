#!/bin/bash
# ============================================================================
# 10xCards API - CURL Test Requests
# ============================================================================
# Complete set of curl commands to test all 18 REST API endpoints
#
# Prerequisites:
# 1. Supabase running locally: npx supabase start
# 2. Astro dev server running: npm run dev
# 3. Set environment variables below
#
# Usage:
# - Source this file: source .ai/curl-test-requests.sh
# - Run individual functions: test_auth_signup
# - Or copy-paste curl commands directly
# ============================================================================

# Environment Variables
BASE_URL="http://localhost:4321"
ACCESS_TOKEN=""  # Will be set after login
TEST_EMAIL="test@example.com"
TEST_PASSWORD="TestPassword123"
TEST_DISPLAY_NAME="Test User"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print section headers
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Helper function to print test names
print_test() {
    echo -e "${YELLOW}>>> $1${NC}\n"
}

# ============================================================================
# PHASE 1: AUTHENTICATION ENDPOINTS (4)
# ============================================================================

# 1. POST /api/auth/signup - User Registration
test_auth_signup() {
    print_header "1. POST /api/auth/signup - Register User"
    print_test "Creating new user account..."
    
    curl -X POST "${BASE_URL}/api/auth/signup" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "'"${TEST_EMAIL}"'",
        "password": "'"${TEST_PASSWORD}"'",
        "displayName": "'"${TEST_DISPLAY_NAME}"'"
      }' \
      | jq .
}

# 2. POST /api/auth/login - User Login
test_auth_login() {
    print_header "2. POST /api/auth/login - Login User"
    print_test "Authenticating user and getting access token..."
    
    RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "'"${TEST_EMAIL}"'",
        "password": "'"${TEST_PASSWORD}"'"
      }')
    
    echo "$RESPONSE" | jq .
    
    # Extract access token for subsequent requests
    ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.session.accessToken // .session.access_token // empty')
    
    if [ -n "$ACCESS_TOKEN" ]; then
        echo -e "\n${GREEN}✓ Access token obtained and saved${NC}"
        echo "ACCESS_TOKEN=${ACCESS_TOKEN:0:20}..."
    else
        echo -e "\n${YELLOW}⚠ Could not extract access token${NC}"
    fi
}

# 3. GET /api/auth/user - Get Current User
test_auth_user() {
    print_header "3. GET /api/auth/user - Get Current User"
    print_test "Fetching current authenticated user with profile..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    curl -X GET "${BASE_URL}/api/auth/user" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# 4. POST /api/auth/logout - User Logout
test_auth_logout() {
    print_header "4. POST /api/auth/logout - Logout User"
    print_test "Logging out and invalidating session..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    curl -X POST "${BASE_URL}/api/auth/logout" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -w "\nHTTP Status: %{http_code}\n"
}

# ============================================================================
# PHASE 2: USER PROFILE ENDPOINTS (3)
# ============================================================================

# 5. GET /api/profile - Get User Profile
test_profile_get() {
    print_header "5. GET /api/profile - Get User Profile"
    print_test "Fetching user profile data..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    curl -X GET "${BASE_URL}/api/profile" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# 6. PATCH /api/profile - Update User Profile
test_profile_update() {
    print_header "6. PATCH /api/profile - Update User Profile"
    print_test "Updating display name..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    curl -X PATCH "${BASE_URL}/api/profile" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "displayName": "Updated Test User"
      }' \
      | jq .
}

# 7. GET /api/profile/stats - Get User Statistics
test_profile_stats() {
    print_header "7. GET /api/profile/stats - Get User Statistics"
    print_test "Fetching comprehensive user statistics..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    curl -X GET "${BASE_URL}/api/profile/stats" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# ============================================================================
# PHASE 3: FLASHCARD CRUD ENDPOINTS (5)
# ============================================================================

# 8. POST /api/flashcards - Create Flashcard (Manual)
test_flashcard_create() {
    print_header "8. POST /api/flashcards - Create Flashcard"
    print_test "Creating a manual flashcard..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    RESPONSE=$(curl -s -X POST "${BASE_URL}/api/flashcards" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "front": "What is the capital of France?",
        "back": "Paris is the capital and largest city of France."
      }')
    
    echo "$RESPONSE" | jq .
    
    # Save flashcard ID for later tests
    FLASHCARD_ID=$(echo "$RESPONSE" | jq -r '.id // empty')
    if [ -n "$FLASHCARD_ID" ]; then
        echo -e "\n${GREEN}✓ Flashcard ID saved: ${FLASHCARD_ID}${NC}"
    fi
}

# 9. GET /api/flashcards - List User Flashcards
test_flashcards_list() {
    print_header "9. GET /api/flashcards - List User Flashcards"
    print_test "Fetching paginated list of flashcards..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    # Test with various query parameters
    echo "Default (page 1, limit 20):"
    curl -X GET "${BASE_URL}/api/flashcards" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
    
    echo -e "\n\nWith filters (source=manual, limit=5):"
    curl -X GET "${BASE_URL}/api/flashcards?source=manual&limit=5" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
    
    echo -e "\n\nWith sorting (sort=created_at:asc):"
    curl -X GET "${BASE_URL}/api/flashcards?sort=created_at:asc" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# 10. GET /api/flashcards/[id] - Get Single Flashcard
test_flashcard_get() {
    print_header "10. GET /api/flashcards/[id] - Get Single Flashcard"
    print_test "Fetching single flashcard by ID..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    if [ -z "$FLASHCARD_ID" ]; then
        echo "Error: FLASHCARD_ID not set. Run test_flashcard_create first."
        return 1
    fi
    
    curl -X GET "${BASE_URL}/api/flashcards/${FLASHCARD_ID}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# 11. PATCH /api/flashcards/[id] - Update Flashcard
test_flashcard_update() {
    print_header "11. PATCH /api/flashcards/[id] - Update Flashcard"
    print_test "Updating flashcard content..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    if [ -z "$FLASHCARD_ID" ]; then
        echo "Error: FLASHCARD_ID not set. Run test_flashcard_create first."
        return 1
    fi
    
    curl -X PATCH "${BASE_URL}/api/flashcards/${FLASHCARD_ID}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "front": "What is the capital of France? (Updated)",
        "back": "Paris is the capital and most populous city of France, located on the Seine River."
      }' \
      | jq .
}

# 12. DELETE /api/flashcards/[id] - Delete Flashcard
test_flashcard_delete() {
    print_header "12. DELETE /api/flashcards/[id] - Delete Flashcard"
    print_test "Deleting flashcard..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    if [ -z "$FLASHCARD_ID" ]; then
        echo "Error: FLASHCARD_ID not set. Run test_flashcard_create first."
        return 1
    fi
    
    curl -X DELETE "${BASE_URL}/api/flashcards/${FLASHCARD_ID}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -w "\nHTTP Status: %{http_code}\n"
}

# ============================================================================
# PHASE 4: REVIEW SYSTEM ENDPOINTS (2)
# ============================================================================

# 13. GET /api/flashcards/due - Get Cards Due for Review
test_flashcards_due() {
    print_header "13. GET /api/flashcards/due - Get Cards Due"
    print_test "Fetching cards due for review..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    # Default limit (20)
    echo "Default limit (20 cards):"
    curl -X GET "${BASE_URL}/api/flashcards/due" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
    
    echo -e "\n\nWith custom limit (5 cards):"
    curl -X GET "${BASE_URL}/api/flashcards/due?limit=5" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# 14. POST /api/flashcards/[id]/review - Review Flashcard (SM-2)
test_flashcard_review() {
    print_header "14. POST /api/flashcards/[id]/review - Review Flashcard"
    print_test "Submitting flashcard review (SM-2 algorithm)..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    if [ -z "$FLASHCARD_ID" ]; then
        echo "Error: FLASHCARD_ID not set. Run test_flashcard_create first."
        return 1
    fi
    
    # Test with quality rating 4 (Correct after hesitation)
    echo "Quality 4 (Correct after hesitation):"
    curl -X POST "${BASE_URL}/api/flashcards/${FLASHCARD_ID}/review" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "quality": 4
      }' \
      | jq .
    
    echo -e "\n\nQuality scale:"
    echo "0: Complete blackout"
    echo "1: Incorrect, but answer seemed familiar"
    echo "2: Incorrect, but easy to recall"
    echo "3: Correct with difficulty"
    echo "4: Correct after hesitation"
    echo "5: Perfect response"
}

# ============================================================================
# PHASE 5: AI GENERATION ENDPOINTS (4)
# ============================================================================

# 15. POST /api/generate - Generate Flashcards from Text
test_generate() {
    print_header "15. POST /api/generate - Generate Flashcards"
    print_test "Generating flashcards from text using AI..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    # Sample text (must be 1000-10000 characters)
    SAMPLE_TEXT="PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance. It uses and extends the SQL language combined with many features that safely store and scale the most complicated data workloads. PostgreSQL has become the preferred open source relational database for many enterprise developers and start-ups, powering leading business and mobile applications. PostgreSQL comes with many features aimed to help developers build applications, administrators to protect data integrity and build fault-tolerant environments, and help you manage your data no matter how big or small the dataset. In addition to being free and open source, PostgreSQL is highly extensible. For example, you can define your own data types, build out custom functions, even write code from different programming languages without recompiling your database. PostgreSQL tries to conform with the SQL standard where such conformance does not contradict traditional features or could lead to poor architectural decisions. Many of the features required by the SQL standard are supported, though sometimes with slightly differing syntax or function."
    
    RESPONSE=$(curl -s -X POST "${BASE_URL}/api/generate" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "inputText": "'"${SAMPLE_TEXT}"'",
        "model": "anthropic/claude-3-5-sonnet"
      }')
    
    echo "$RESPONSE" | jq .
    
    # Save session ID for next test
    SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId // empty')
    if [ -n "$SESSION_ID" ]; then
        echo -e "\n${GREEN}✓ Session ID saved: ${SESSION_ID}${NC}"
    fi
}

# 16. POST /api/generate/[sessionId]/accept - Accept Generated Cards
test_generate_accept() {
    print_header "16. POST /api/generate/[sessionId]/accept - Accept Cards"
    print_test "Accepting generated flashcards..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    if [ -z "$SESSION_ID" ]; then
        echo "Error: SESSION_ID not set. Run test_generate first."
        return 1
    fi
    
    # Note: Replace temp UUIDs with actual ones from generation response
    curl -X POST "${BASE_URL}/api/generate/${SESSION_ID}/accept" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "cards": [
          {
            "id": "temp-uuid-1",
            "front": "What is PostgreSQL?",
            "back": "PostgreSQL is a powerful, open source object-relational database system."
          },
          {
            "id": "temp-uuid-2",
            "front": "How long has PostgreSQL been in development?",
            "back": "PostgreSQL has over 35 years of active development."
          }
        ]
      }' \
      | jq .
    
    echo -e "\n${YELLOW}Note: Replace temp UUIDs with actual IDs from generate response${NC}"
}

# 17. GET /api/sessions - List Generation Sessions
test_sessions_list() {
    print_header "17. GET /api/sessions - List Generation Sessions"
    print_test "Fetching list of generation sessions..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    # Default list
    echo "Default (page 1, limit 20):"
    curl -X GET "${BASE_URL}/api/sessions" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
    
    # With status filter
    echo -e "\n\nWith status filter (status=success):"
    curl -X GET "${BASE_URL}/api/sessions?status=success" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# 18. GET /api/sessions/[id] - Get Single Generation Session
test_session_get() {
    print_header "18. GET /api/sessions/[id] - Get Single Session"
    print_test "Fetching single generation session with flashcards..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "Error: ACCESS_TOKEN not set. Run test_auth_login first."
        return 1
    fi
    
    if [ -z "$SESSION_ID" ]; then
        echo "Error: SESSION_ID not set. Run test_generate first."
        return 1
    fi
    
    curl -X GET "${BASE_URL}/api/sessions/${SESSION_ID}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      | jq .
}

# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

# Run all authentication tests
test_all_auth() {
    test_auth_signup
    sleep 1
    test_auth_login
    sleep 1
    test_auth_user
}

# Run all profile tests
test_all_profile() {
    test_profile_get
    sleep 1
    test_profile_update
    sleep 1
    test_profile_stats
}

# Run all flashcard tests
test_all_flashcards() {
    test_flashcard_create
    sleep 1
    test_flashcards_list
    sleep 1
    test_flashcard_get
    sleep 1
    test_flashcard_update
    sleep 1
    test_flashcards_due
    sleep 1
    test_flashcard_review
    # Note: Don't delete here, as we need cards for other tests
}

# Run all generation tests
test_all_generation() {
    test_generate
    sleep 2  # AI takes longer
    # test_generate_accept  # Commented - needs manual UUID input
    test_sessions_list
    sleep 1
    test_session_get
}

# Run complete test suite (except logout and delete)
test_all() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Running Complete Test Suite${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    test_all_auth
    sleep 1
    test_all_profile
    sleep 1
    test_all_flashcards
    sleep 1
    test_all_generation
    
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Test Suite Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Display help
show_help() {
    echo -e "${BLUE}10xCards API Test Commands${NC}\n"
    echo "Individual Tests:"
    echo "  test_auth_signup       - 1. Register user"
    echo "  test_auth_login        - 2. Login user (saves token)"
    echo "  test_auth_user         - 3. Get current user"
    echo "  test_auth_logout       - 4. Logout user"
    echo ""
    echo "  test_profile_get       - 5. Get user profile"
    echo "  test_profile_update    - 6. Update profile"
    echo "  test_profile_stats     - 7. Get user statistics"
    echo ""
    echo "  test_flashcard_create  - 8. Create flashcard"
    echo "  test_flashcards_list   - 9. List flashcards"
    echo "  test_flashcard_get     - 10. Get single flashcard"
    echo "  test_flashcard_update  - 11. Update flashcard"
    echo "  test_flashcard_delete  - 12. Delete flashcard"
    echo "  test_flashcards_due    - 13. Get cards due"
    echo "  test_flashcard_review  - 14. Review flashcard"
    echo ""
    echo "  test_generate          - 15. Generate flashcards"
    echo "  test_generate_accept   - 16. Accept cards"
    echo "  test_sessions_list     - 17. List sessions"
    echo "  test_session_get       - 18. Get single session"
    echo ""
    echo "Test Suites:"
    echo "  test_all_auth          - Run all auth tests (1-3)"
    echo "  test_all_profile       - Run all profile tests (5-7)"
    echo "  test_all_flashcards    - Run all flashcard tests (8-11, 13-14)"
    echo "  test_all_generation    - Run all generation tests (15, 17-18)"
    echo "  test_all               - Run complete suite"
    echo ""
    echo "Environment:"
    echo "  BASE_URL: ${BASE_URL}"
    echo "  TEST_EMAIL: ${TEST_EMAIL}"
    echo "  ACCESS_TOKEN: ${ACCESS_TOKEN:+[SET]}${ACCESS_TOKEN:-[NOT SET]}"
}

# Print help on source
echo -e "${GREEN}10xCards API Test Suite Loaded!${NC}"
echo "Type 'show_help' to see available commands"
echo ""

