/**
 * Database Types for 10x-cards
 * Auto-generated types based on database schema
 * 
 * These types match the PostgreSQL schema defined in:
 * supabase/migrations/001_init_schema.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type FlashcardSource = 'ai_generated' | 'manual';

export type GenerationStatus = 'success' | 'failed' | 'partial';

// ============================================================================
// DATABASE TABLES
// ============================================================================

/**
 * Profile table - extends auth.users with additional user data
 */
export interface Profile {
  id: string; // UUID
  user_id: string; // UUID, references auth.users
  display_name: string | null;
  total_cards_created: number;
  total_cards_generated_by_ai: number;
  daily_generation_count: number;
  last_generation_date: string | null; // ISO date string
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * Flashcard table - stores user flashcards with spaced repetition metadata
 */
export interface Flashcard {
  id: string; // UUID
  user_id: string; // UUID, references auth.users
  generation_session_id: string | null; // UUID, references generation_sessions
  front: string; // 1-1000 chars
  back: string; // 1-2000 chars
  source: FlashcardSource;
  ease_factor: number; // Decimal, min 1.3, default 2.5
  interval_days: number; // Integer, min 0, default 0
  repetitions: number; // Integer, min 0, default 0
  next_review_date: string; // ISO datetime string
  last_reviewed_at: string | null; // ISO datetime string
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * Generation session table - audit log of AI generation attempts
 */
export interface GenerationSession {
  id: string; // UUID
  user_id: string; // UUID, references auth.users
  input_text: string; // 1000-10000 chars
  generated_count: number;
  accepted_count: number;
  rejected_count: number;
  status: GenerationStatus;
  error_message: string | null;
  generation_time_ms: number | null;
  tokens_used: number | null;
  model_used: string | null;
  created_at: string; // ISO datetime string
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

/**
 * Type for inserting a new profile
 * Omits auto-generated fields
 */
export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;

/**
 * Type for inserting a new flashcard
 * Omits auto-generated and optional fields
 */
export type FlashcardInsert = Omit<
  Flashcard,
  'id' | 'created_at' | 'updated_at'
> & {
  // Make SM-2 fields optional for insert (they have defaults)
  ease_factor?: number;
  interval_days?: number;
  repetitions?: number;
  next_review_date?: string;
  last_reviewed_at?: string | null;
};

/**
 * Type for inserting a new generation session
 * Omits auto-generated and optional fields
 */
export type GenerationSessionInsert = Omit<
  GenerationSession,
  'id' | 'created_at'
> & {
  // Make optional fields explicit
  accepted_count?: number;
  rejected_count?: number;
  error_message?: string | null;
  generation_time_ms?: number | null;
  tokens_used?: number | null;
  model_used?: string | null;
};

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

/**
 * Type for updating a profile
 * All fields optional except id
 */
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'user_id' | 'created_at'>>;

/**
 * Type for updating a flashcard
 * All fields optional except id
 */
export type FlashcardUpdate = Partial<
  Omit<Flashcard, 'id' | 'user_id' | 'created_at'>
>;

/**
 * Type for updating a generation session
 * Note: generation_sessions is immutable (no updates allowed)
 */
export type GenerationSessionUpdate = never;

// ============================================================================
// FUNCTION RETURN TYPES
// ============================================================================

/**
 * Return type for get_cards_due_for_review() function
 */
export interface CardDueForReview {
  id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
}

/**
 * Return type for get_user_stats() function
 */
export interface UserStats {
  total_cards_created: number;
  total_cards_generated_by_ai: number;
  cards_due_today: number;
  total_reviews_completed: number;
  total_generation_sessions: number;
  total_accepted_cards: number;
  average_acceptance_rate: number;
  daily_generation_count: number;
  last_generation_date: string | null;
}

/**
 * Quality rating for SM-2 algorithm (0-5)
 * Used in update_card_review() function
 */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

// ============================================================================
// DATABASE SCHEMA TYPE
// ============================================================================

/**
 * Full database schema type for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      flashcards: {
        Row: Flashcard;
        Insert: FlashcardInsert;
        Update: FlashcardUpdate;
      };
      generation_sessions: {
        Row: GenerationSession;
        Insert: GenerationSessionInsert;
        Update: GenerationSessionUpdate;
      };
    };
    Views: {
      // No views defined yet
    };
    Functions: {
      update_card_review: {
        Args: {
          card_uuid: string;
          quality: ReviewQuality;
        };
        Returns: Flashcard;
      };
      get_cards_due_for_review: {
        Args: {
          user_uuid: string;
          limit_count?: number;
        };
        Returns: CardDueForReview[];
      };
      get_user_stats: {
        Args: {
          user_uuid: string;
        };
        Returns: UserStats;
      };
    };
    Enums: {
      flashcard_source: FlashcardSource;
      generation_status: GenerationStatus;
    };
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Helper type for Supabase query results
 */
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;

/**
 * Helper type for Supabase error
 */
export type DbResultOk<T> = T extends { data: infer U } ? U : never;

/**
 * Helper type for Supabase error
 */
export type DbResultErr = { error: { message: string } };

