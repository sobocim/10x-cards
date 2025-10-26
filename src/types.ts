/**
 * Data Transfer Objects (DTOs) and Command Models for 10xCards API
 *
 * This file contains type definitions for API requests and responses.
 * All DTOs are derived from database entity types to ensure type safety.
 */

import type { Profile, Flashcard, GenerationSession, FlashcardSource, GenerationStatus } from "./db/types";

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Standard pagination response metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// AUTHENTICATION DTOs
// ============================================================================

/**
 * User signup request
 */
export interface SignupRequest {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * User login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Authentication session data
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Basic user information
 */
export interface UserInfo {
  id: string;
  email: string;
}

/**
 * Authentication response (signup/login)
 */
export interface AuthResponse {
  user: UserInfo;
  session: AuthSession;
}

/**
 * Current user response with profile data
 */
export interface CurrentUserResponse {
  id: string;
  email: string;
  profile: {
    displayName: string | null;
    totalCardsCreated: number;
    totalCardsGeneratedByAI: number;
    dailyGenerationCount: number;
    lastGenerationDate: string | null;
  };
}

// ============================================================================
// USER PROFILE DTOs
// ============================================================================

/**
 * Profile response DTO
 * Derived from Profile entity with camelCase field names
 */
export interface ProfileResponse {
  id: string;
  userId: string;
  displayName: string | null;
  totalCardsCreated: number;
  totalCardsGeneratedByAI: number;
  dailyGenerationCount: number;
  lastGenerationDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Update profile request
 * Only displayName can be updated by user
 */
export interface UpdateProfileRequest {
  displayName?: string;
}

/**
 * User statistics response
 * Returned by get_user_stats() database function
 */
export interface UserStatsResponse {
  totalCardsCreated: number;
  totalCardsGeneratedByAI: number;
  cardsDueToday: number;
  totalReviewsCompleted: number;
  totalGenerationSessions: number;
  totalAcceptedCards: number;
  averageAcceptanceRate: number;
  dailyGenerationCount: number;
  lastGenerationDate: string | null;
}

// ============================================================================
// FLASHCARD DTOs
// ============================================================================

/**
 * Flashcard response DTO
 * Derived from Flashcard entity with camelCase field names
 */
export interface FlashcardResponse {
  id: string;
  userId: string;
  generationSessionId: string | null;
  front: string;
  back: string;
  source: FlashcardSource;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create flashcard request (manual)
 */
export interface CreateFlashcardRequest {
  front: string;
  back: string;
}

/**
 * Update flashcard request
 */
export interface UpdateFlashcardRequest {
  front?: string;
  back?: string;
}

/**
 * Flashcards list response with pagination
 */
export interface FlashcardsListResponse {
  data: FlashcardResponse[];
  pagination: PaginationMeta;
}

/**
 * Flashcards list query parameters
 */
export interface FlashcardsListParams extends PaginationParams {
  source?: FlashcardSource;
  sort?: string;
}

/**
 * Card due for review DTO
 * Simplified flashcard for review session
 */
export interface CardDueForReview {
  id: string;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
}

/**
 * Cards due for review response
 */
export interface CardsDueResponse {
  data: CardDueForReview[];
  count: number;
}

/**
 * Review flashcard request
 * Quality rating for SM-2 algorithm (0-5)
 */
export interface ReviewCardRequest {
  quality: 0 | 1 | 2 | 3 | 4 | 5;
}

// ============================================================================
// AI GENERATION DTOs
// ============================================================================

/**
 * Generate flashcards from text request
 */
export interface GenerateFlashcardsRequest {
  inputText: string;
  model?: string;
}

/**
 * Temporary generated card (before acceptance)
 */
export interface GeneratedCard {
  id: string; // Temporary UUID
  front: string;
  back: string;
}

/**
 * Generate flashcards response
 */
export interface GenerateFlashcardsResponse {
  sessionId: string;
  status: "success" | "failed" | "partial";
  generatedCards: GeneratedCard[];
  generatedCount: number;
  generationTimeMs: number;
  tokensUsed: number;
}

/**
 * Accept generated flashcards request
 */
export interface AcceptCardsRequest {
  cards: GeneratedCard[];
}

/**
 * Accept generated flashcards response
 */
export interface AcceptCardsResponse {
  sessionId: string;
  acceptedCount: number;
  rejectedCount: number;
  flashcards: FlashcardResponse[];
}

// ============================================================================
// GENERATION SESSION DTOs
// ============================================================================

/**
 * Generation session response DTO
 * Derived from GenerationSession entity with camelCase field names
 */
export interface GenerationSessionResponse {
  id: string;
  userId: string;
  inputText: string;
  generatedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  status: GenerationStatus;
  errorMessage: string | null;
  generationTimeMs: number | null;
  tokensUsed: number | null;
  modelUsed: string | null;
  createdAt: string;
}

/**
 * Generation session with linked flashcards
 */
export interface GenerationSessionWithCards extends GenerationSessionResponse {
  flashcards: {
    id: string;
    front: string;
    back: string;
  }[];
}

/**
 * Generation sessions list response with pagination
 */
export interface GenerationSessionsListResponse {
  data: GenerationSessionResponse[];
  pagination: PaginationMeta;
}

/**
 * Generation sessions list query parameters
 */
export interface GenerationSessionsListParams extends PaginationParams {
  status?: GenerationStatus;
}

// ============================================================================
// COMMAND MODELS (for internal use)
// ============================================================================

/**
 * Create profile command
 * Used internally when creating user profile after signup
 */
export interface CreateProfileCommand {
  userId: string;
  displayName?: string;
}

/**
 * Create flashcard command (manual)
 * Used internally to create flashcard in database
 */
export interface CreateFlashcardCommand {
  userId: string;
  front: string;
  back: string;
  source: "manual";
}

/**
 * Create flashcard command (AI-generated)
 * Used internally to save accepted AI-generated cards
 */
export interface CreateAIFlashcardCommand {
  userId: string;
  generationSessionId: string;
  front: string;
  back: string;
  source: "ai_generated";
}

/**
 * Update flashcard command
 * Used internally to update flashcard in database
 */
export interface UpdateFlashcardCommand {
  front?: string;
  back?: string;
}

/**
 * Review flashcard command
 * Used internally to call update_card_review database function
 */
export interface ReviewFlashcardCommand {
  cardId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Create generation session command
 * Used internally to create generation session record
 */
export interface CreateGenerationSessionCommand {
  userId: string;
  inputText: string;
  generatedCount: number;
  status: GenerationStatus;
  errorMessage?: string | null;
  generationTimeMs?: number | null;
  tokensUsed?: number | null;
  modelUsed?: string | null;
}

/**
 * Update generation session command
 * Used internally to update acceptance counts
 */
export interface UpdateGenerationSessionCommand {
  acceptedCount: number;
  rejectedCount: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid quality rating
 */
export function isValidQuality(value: number): value is 0 | 1 | 2 | 3 | 4 | 5 {
  return Number.isInteger(value) && value >= 0 && value <= 5;
}

/**
 * Type guard to check if a value is a valid flashcard source
 */
export function isFlashcardSource(value: string): value is FlashcardSource {
  return value === "ai_generated" || value === "manual";
}

/**
 * Type guard to check if a value is a valid generation status
 */
export function isGenerationStatus(value: string): value is GenerationStatus {
  return value === "success" || value === "failed" || value === "partial";
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Convert database entity to response DTO
 * Transforms snake_case fields to camelCase
 */
export type EntityToDTO<T> = {
  [K in keyof T as K extends string ? CamelCase<K> : K]: T[K];
};

/**
 * Helper type to convert snake_case to camelCase
 */
type CamelCase<S extends string> = S extends `${infer P}_${infer Q}` ? `${Lowercase<P>}${Capitalize<CamelCase<Q>>}` : S;

/**
 * Response wrapper type for API endpoints
 */
export type ApiResponse<T> = T | ErrorResponse;

/**
 * Async API response type
 */
export type AsyncApiResponse<T> = Promise<ApiResponse<T>>;
