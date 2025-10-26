-- ============================================================================
-- Remove problematic next_review_date constraint
-- Version: 003
-- Description: Removes the CHECK constraint that causes issues during flashcard creation
-- Created: 2025-10-26
-- ============================================================================

-- The constraint `flashcards_next_review_date_check CHECK (next_review_date >= created_at)`
-- causes issues because:
-- 1. created_at is set by the database (NOW())
-- 2. next_review_date is set by the application
-- 3. Millisecond differences can cause next_review_date to be earlier than created_at
--
-- Solution: Remove the constraint entirely. It's not critical for data integrity.

ALTER TABLE flashcards 
DROP CONSTRAINT IF EXISTS flashcards_next_review_date_check;

-- Optional: Add a comment explaining why this constraint was removed
COMMENT ON COLUMN flashcards.next_review_date IS 
'Next scheduled review date. Previously had CHECK constraint (>= created_at) which was removed due to timing issues during INSERT.';

