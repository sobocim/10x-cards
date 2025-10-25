-- ============================================================================
-- 10x-cards Database Schema Migration
-- Version: 001
-- Description: Initial database schema for MVP
-- Created: 2025-10-25
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Enum for flashcard source (AI generated vs manual)
CREATE TYPE flashcard_source AS ENUM ('ai_generated', 'manual');

-- Enum for generation session status
CREATE TYPE generation_status AS ENUM ('success', 'failed', 'partial');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Profiles table - extends auth.users with additional user data
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(100),
    total_cards_created INTEGER NOT NULL DEFAULT 0,
    total_cards_generated_by_ai INTEGER NOT NULL DEFAULT 0,
    daily_generation_count INTEGER NOT NULL DEFAULT 0,
    last_generation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Flashcards table - stores user flashcards with spaced repetition metadata
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    generation_session_id UUID,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    source flashcard_source NOT NULL,
    ease_factor DECIMAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    next_review_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT flashcards_front_check CHECK (LENGTH(front) > 0 AND LENGTH(front) <= 1000),
    CONSTRAINT flashcards_back_check CHECK (LENGTH(back) > 0 AND LENGTH(back) <= 2000),
    CONSTRAINT flashcards_ease_factor_check CHECK (ease_factor >= 1.0),
    CONSTRAINT flashcards_interval_days_check CHECK (interval_days >= 0),
    CONSTRAINT flashcards_repetitions_check CHECK (repetitions >= 0),
    CONSTRAINT flashcards_next_review_date_check CHECK (next_review_date >= created_at)
);

-- Generation sessions table - audit log of AI generation attempts
CREATE TABLE generation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    input_text TEXT NOT NULL,
    generated_count INTEGER NOT NULL DEFAULT 0,
    accepted_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    status generation_status NOT NULL,
    error_message TEXT,
    generation_time_ms INTEGER,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT generation_sessions_input_text_check CHECK (LENGTH(input_text) >= 1000 AND LENGTH(input_text) <= 10000),
    CONSTRAINT generation_sessions_accepted_count_check CHECK (accepted_count <= generated_count),
    CONSTRAINT generation_sessions_counts_check CHECK (accepted_count + rejected_count <= generated_count)
);

-- ============================================================================
-- 3. FOREIGN KEYS
-- ============================================================================

-- Profiles foreign keys
ALTER TABLE profiles
    ADD CONSTRAINT profiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Flashcards foreign keys
ALTER TABLE flashcards
    ADD CONSTRAINT flashcards_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

ALTER TABLE flashcards
    ADD CONSTRAINT flashcards_generation_session_id_fkey 
    FOREIGN KEY (generation_session_id) 
    REFERENCES generation_sessions(id) 
    ON DELETE SET NULL;

-- Generation sessions foreign keys
ALTER TABLE generation_sessions
    ADD CONSTRAINT generation_sessions_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-create profile for new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update profile statistics on flashcard INSERT/DELETE
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles 
        SET 
            total_cards_created = total_cards_created + 1,
            total_cards_generated_by_ai = CASE 
                WHEN NEW.source = 'ai_generated' 
                THEN total_cards_generated_by_ai + 1 
                ELSE total_cards_generated_by_ai 
            END
        WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles 
        SET 
            total_cards_created = total_cards_created - 1,
            total_cards_generated_by_ai = CASE 
                WHEN OLD.source = 'ai_generated' 
                THEN total_cards_generated_by_ai - 1 
                ELSE total_cards_generated_by_ai 
            END
        WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Update profile statistics on flashcard source change
CREATE OR REPLACE FUNCTION update_profile_stats_on_source_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source != NEW.source THEN
        IF OLD.source = 'ai_generated' AND NEW.source = 'manual' THEN
            UPDATE profiles 
            SET total_cards_generated_by_ai = total_cards_generated_by_ai - 1 
            WHERE user_id = NEW.user_id;
        ELSIF OLD.source = 'manual' AND NEW.source = 'ai_generated' THEN
            UPDATE profiles 
            SET total_cards_generated_by_ai = total_cards_generated_by_ai + 1 
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update flashcard review using SM-2 algorithm
CREATE OR REPLACE FUNCTION update_card_review(
    card_uuid UUID,
    quality INTEGER
)
RETURNS flashcards AS $$
DECLARE
    card flashcards;
    new_ease_factor DECIMAL;
    new_interval_days INTEGER;
    new_repetitions INTEGER;
BEGIN
    -- Validate quality parameter
    IF quality < 0 OR quality > 5 THEN
        RAISE EXCEPTION 'Quality must be between 0 and 5';
    END IF;
    
    -- Get current card data
    SELECT * INTO card FROM flashcards WHERE id = card_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Flashcard not found';
    END IF;
    
    -- SM-2 Algorithm implementation
    IF quality >= 3 THEN
        -- Correct response
        new_repetitions := card.repetitions + 1;
        
        -- Calculate new ease factor
        new_ease_factor := card.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        IF new_ease_factor < 1.3 THEN
            new_ease_factor := 1.3;
        END IF;
        
        -- Calculate new interval
        IF new_repetitions = 1 THEN
            new_interval_days := 1;
        ELSIF new_repetitions = 2 THEN
            new_interval_days := 6;
        ELSE
            new_interval_days := ROUND(card.interval_days * new_ease_factor);
        END IF;
    ELSE
        -- Incorrect response - reset
        new_repetitions := 0;
        new_interval_days := 1;
        new_ease_factor := card.ease_factor;
    END IF;
    
    -- Update the flashcard
    UPDATE flashcards
    SET
        ease_factor = new_ease_factor,
        interval_days = new_interval_days,
        repetitions = new_repetitions,
        next_review_date = NOW() + (new_interval_days || ' days')::INTERVAL,
        last_reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = card_uuid
    RETURNING * INTO card;
    
    RETURN card;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function: Get flashcards due for review
CREATE OR REPLACE FUNCTION get_cards_due_for_review(
    user_uuid UUID,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    front TEXT,
    back TEXT,
    ease_factor DECIMAL,
    interval_days INTEGER,
    repetitions INTEGER,
    next_review_date TIMESTAMP WITH TIME ZONE,
    last_reviewed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.front,
        f.back,
        f.ease_factor,
        f.interval_days,
        f.repetitions,
        f.next_review_date,
        f.last_reviewed_at
    FROM flashcards f
    WHERE 
        f.user_id = user_uuid 
        AND f.next_review_date <= NOW()
    ORDER BY 
        f.next_review_date ASC,
        RANDOM()
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function: Get comprehensive user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_cards_created', COALESCE(p.total_cards_created, 0),
        'total_cards_generated_by_ai', COALESCE(p.total_cards_generated_by_ai, 0),
        'cards_due_today', (
            SELECT COUNT(*) 
            FROM flashcards 
            WHERE user_id = user_uuid 
            AND next_review_date <= NOW()
        ),
        'total_reviews_completed', (
            SELECT COUNT(*) 
            FROM flashcards 
            WHERE user_id = user_uuid 
            AND repetitions > 0
        ),
        'total_generation_sessions', (
            SELECT COUNT(*) 
            FROM generation_sessions 
            WHERE user_id = user_uuid
        ),
        'total_accepted_cards', (
            SELECT COALESCE(SUM(accepted_count), 0) 
            FROM generation_sessions 
            WHERE user_id = user_uuid
        ),
        'average_acceptance_rate', (
            SELECT CASE 
                WHEN SUM(generated_count) > 0 
                THEN ROUND((SUM(accepted_count)::DECIMAL / SUM(generated_count)::DECIMAL) * 100, 2)
                ELSE 0 
            END
            FROM generation_sessions 
            WHERE user_id = user_uuid AND status = 'success'
        ),
        'daily_generation_count', COALESCE(p.daily_generation_count, 0),
        'last_generation_date', p.last_generation_date
    ) INTO result
    FROM profiles p
    WHERE p.user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger: Auto-create profile for new user (on auth.users)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Trigger: Auto-update updated_at on profiles
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on flashcards
CREATE TRIGGER set_updated_at_flashcards
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update profile stats after flashcard insert
CREATE TRIGGER update_stats_after_insert
    AFTER INSERT ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_stats();

-- Trigger: Update profile stats after flashcard delete
CREATE TRIGGER update_stats_after_delete
    AFTER DELETE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_stats();

-- Trigger: Update profile stats on source change
CREATE TRIGGER update_stats_on_source_change
    AFTER UPDATE ON flashcards
    FOR EACH ROW
    WHEN (OLD.source IS DISTINCT FROM NEW.source)
    EXECUTE FUNCTION update_profile_stats_on_source_change();

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Flashcards indexes
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_next_review_date ON flashcards(next_review_date, user_id);
CREATE INDEX idx_flashcards_created_at ON flashcards(user_id, created_at DESC);
CREATE INDEX idx_flashcards_source ON flashcards(user_id, source);

-- Partial index for cards due for review (performance optimization)
CREATE INDEX idx_flashcards_due_review 
    ON flashcards(user_id, next_review_date) 
    WHERE next_review_date <= NOW();

-- Generation sessions indexes
CREATE INDEX idx_generation_sessions_user_id ON generation_sessions(user_id, created_at DESC);

-- Full-text search index on input_text (optional, for future use)
CREATE INDEX idx_generation_sessions_input_text 
    ON generation_sessions 
    USING gin(to_tsvector('english', input_text));

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Flashcards RLS Policies
CREATE POLICY "Users can view own flashcards" 
    ON flashcards FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own flashcards" 
    ON flashcards FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own flashcards" 
    ON flashcards FOR UPDATE 
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own flashcards" 
    ON flashcards FOR DELETE 
    USING (user_id = auth.uid());

-- Generation Sessions RLS Policies (immutable audit log)
CREATE POLICY "Users can view own sessions" 
    ON generation_sessions FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions" 
    ON generation_sessions FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users cannot update sessions" 
    ON generation_sessions FOR UPDATE 
    USING (false);

CREATE POLICY "Users cannot delete sessions" 
    ON generation_sessions FOR DELETE 
    USING (false);

-- ============================================================================
-- 8. COMMENTS (Documentation)
-- ============================================================================

-- Table comments
COMMENT ON TABLE profiles IS 'Extended user profiles with statistics and preferences';
COMMENT ON TABLE flashcards IS 'User flashcards for spaced repetition learning with SM-2 algorithm metadata';
COMMENT ON TABLE generation_sessions IS 'Audit log of AI flashcard generation attempts (immutable)';

-- Profiles column comments
COMMENT ON COLUMN profiles.user_id IS 'Foreign key to auth.users';
COMMENT ON COLUMN profiles.total_cards_created IS 'Total number of flashcards created by user';
COMMENT ON COLUMN profiles.total_cards_generated_by_ai IS 'Number of flashcards generated using AI';
COMMENT ON COLUMN profiles.daily_generation_count IS 'Number of generation sessions today (for rate limiting)';
COMMENT ON COLUMN profiles.last_generation_date IS 'Date of last generation session (for rate limiting reset)';

-- Flashcards column comments
COMMENT ON COLUMN flashcards.source IS 'Origin of flashcard: ai_generated or manual';
COMMENT ON COLUMN flashcards.ease_factor IS 'SM-2 algorithm ease factor (minimum 1.3)';
COMMENT ON COLUMN flashcards.interval_days IS 'Days until next review (SM-2 algorithm)';
COMMENT ON COLUMN flashcards.repetitions IS 'Number of successful reviews (SM-2 algorithm)';
COMMENT ON COLUMN flashcards.next_review_date IS 'Scheduled date for next review';
COMMENT ON COLUMN flashcards.last_reviewed_at IS 'Timestamp of last review';
COMMENT ON COLUMN flashcards.generation_session_id IS 'Link to generation session (null for manual cards)';

-- Generation sessions column comments
COMMENT ON COLUMN generation_sessions.input_text IS 'User input text used for generation (1000-10000 chars)';
COMMENT ON COLUMN generation_sessions.generated_count IS 'Number of flashcards generated by AI';
COMMENT ON COLUMN generation_sessions.accepted_count IS 'Number of flashcards accepted by user';
COMMENT ON COLUMN generation_sessions.rejected_count IS 'Number of flashcards rejected by user';
COMMENT ON COLUMN generation_sessions.status IS 'Generation status: success, failed, or partial';
COMMENT ON COLUMN generation_sessions.error_message IS 'Error details if generation failed';
COMMENT ON COLUMN generation_sessions.generation_time_ms IS 'API response time in milliseconds';
COMMENT ON COLUMN generation_sessions.tokens_used IS 'Number of tokens used by LLM (for cost tracking)';
COMMENT ON COLUMN generation_sessions.model_used IS 'LLM model identifier used for generation';

-- Enum type comments
COMMENT ON TYPE flashcard_source IS 'Source type of flashcard: ai_generated or manual';
COMMENT ON TYPE generation_status IS 'Status of generation session: success, failed, or partial';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

