-- ============================================================================
-- 10x-cards Database Seed Data
-- Version: 002
-- Description: Test data for development and staging environments
-- Created: 2025-10-25
-- WARNING: DO NOT RUN THIS ON PRODUCTION!
-- ============================================================================

-- This file should only be used in development/staging environments
-- It provides sample data for testing the application

-- ============================================================================
-- IMPORTANT NOTES:
-- 1. This assumes you have created a test user in auth.users through Supabase
--    Auth interface or signup flow
-- 2. Replace the user_id values below with actual UUIDs from your test users
-- 3. The profile will be auto-created by trigger, but you can verify it exists
-- ============================================================================

-- ============================================================================
-- 1. SAMPLE USER PROFILE
-- ============================================================================

-- Example: Verify or insert test user profile
-- Replace '00000000-0000-0000-0000-000000000001' with actual test user UUID
INSERT INTO profiles (
    user_id,
    display_name,
    total_cards_created,
    total_cards_generated_by_ai,
    daily_generation_count,
    last_generation_date,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Test User',
    0, -- Will be updated by triggers
    0, -- Will be updated by triggers
    2,
    CURRENT_DATE,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 2. SAMPLE GENERATION SESSIONS
-- ============================================================================

-- Sample successful generation session
INSERT INTO generation_sessions (
    id,
    user_id,
    input_text,
    generated_count,
    accepted_count,
    rejected_count,
    status,
    error_message,
    generation_time_ms,
    tokens_used,
    model_used,
    created_at
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance. It uses and extends the SQL language combined with many features that safely store and scale the most complicated data workloads. PostgreSQL comes with many features aimed to help developers build applications, administrators to protect data integrity and build fault-tolerant environments, and help you manage your data no matter how big or small the dataset. In addition to being free and open source, PostgreSQL is highly extensible. For example, you can define your own data types, build out custom functions, even write code from different programming languages without recompiling your database! PostgreSQL has been proven to be highly scalable both in the sheer quantity of data it can manage and in the number of concurrent users it can accommodate.',
    5,
    4,
    1,
    'success',
    NULL,
    2500,
    450,
    'anthropic/claude-3-5-sonnet',
    NOW() - INTERVAL '2 days'
);

-- Sample failed generation session
INSERT INTO generation_sessions (
    id,
    user_id,
    input_text,
    generated_count,
    accepted_count,
    rejected_count,
    status,
    error_message,
    generation_time_ms,
    tokens_used,
    model_used,
    created_at
) VALUES (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'React is a JavaScript library for building user interfaces. It is maintained by Meta and a community of individual developers and companies. React can be used as a base in the development of single-page, mobile, or server-rendered applications with frameworks like Next.js. However, React is only concerned with the user interface and rendering components to the DOM, so React applications often rely on libraries for routing and other client-side functionality. A key advantage of React is that it only re-renders the parts of the interface that have changed. This is done through a virtual DOM - a lightweight copy of the actual DOM. When state changes in a React component, React updates the virtual DOM and compares it with the previous version to determine what has changed. It then updates only those parts of the real DOM that need to be updated.',
    0,
    0,
    0,
    'failed',
    'API timeout after 30 seconds',
    30000,
    NULL,
    'anthropic/claude-3-5-sonnet',
    NOW() - INTERVAL '1 day'
);

-- ============================================================================
-- 3. SAMPLE FLASHCARDS
-- ============================================================================

-- Sample AI-generated flashcards (linked to generation session)
INSERT INTO flashcards (
    id,
    user_id,
    generation_session_id,
    front,
    back,
    source,
    ease_factor,
    interval_days,
    repetitions,
    next_review_date,
    last_reviewed_at,
    created_at,
    updated_at
) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'What is PostgreSQL?',
    'PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development, known for reliability, feature robustness, and performance.',
    'ai_generated',
    2.5,
    0,
    0,
    NOW(),
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'What language does PostgreSQL use?',
    'PostgreSQL uses and extends the SQL language combined with many features that safely store and scale complicated data workloads.',
    'ai_generated',
    2.6,
    1,
    1,
    NOW() + INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
),
(
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Is PostgreSQL free and open source?',
    'Yes, PostgreSQL is free and open source. It is also highly extensible, allowing developers to define custom data types, functions, and write code from different programming languages.',
    'ai_generated',
    2.8,
    6,
    2,
    NOW() + INTERVAL '6 days',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
),
(
    '20000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'What are the main benefits of PostgreSQL for developers?',
    'PostgreSQL helps developers build applications, administrators protect data integrity and build fault-tolerant environments, and manage data regardless of dataset size.',
    'ai_generated',
    2.5,
    0,
    0,
    NOW() - INTERVAL '2 hours',
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
);

-- Sample manually created flashcards (no generation session)
INSERT INTO flashcards (
    id,
    user_id,
    generation_session_id,
    front,
    back,
    source,
    ease_factor,
    interval_days,
    repetitions,
    next_review_date,
    last_reviewed_at,
    created_at,
    updated_at
) VALUES
(
    '20000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'What is the capital of France?',
    'Paris',
    'manual',
    2.5,
    0,
    0,
    NOW(),
    NULL,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    '20000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'What is 2 + 2?',
    '4',
    'manual',
    3.2,
    15,
    5,
    NOW() + INTERVAL '15 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '3 days'
),
(
    '20000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'What does HTML stand for?',
    'HyperText Markup Language',
    'manual',
    2.7,
    3,
    2,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '4 days'
);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify the seed data was inserted correctly:

-- SELECT COUNT(*) as profile_count FROM profiles;
-- SELECT COUNT(*) as flashcard_count FROM flashcards;
-- SELECT COUNT(*) as session_count FROM generation_sessions;
-- SELECT * FROM get_user_stats('00000000-0000-0000-0000-000000000001');
-- SELECT * FROM get_cards_due_for_review('00000000-0000-0000-0000-000000000001', 10);

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================

