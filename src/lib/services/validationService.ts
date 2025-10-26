/**
 * Validation Service - Zod Schemas for API Request Validation
 * 
 * This service provides Zod validation schemas for all API endpoints.
 * Schemas handle input validation, transformation, and type safety.
 */

import { z } from 'zod';

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Schema for user signup request
 * - Email: Valid email format
 * - Password: 8-72 characters (Supabase limit)
 * - Display Name: Optional, max 100 characters
 */
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters'),
  displayName: z.string()
    .max(100, 'Display name must not exceed 100 characters')
    .optional()
    .transform(val => val?.trim() || null)
});

/**
 * Schema for user login request
 * - Email: Required, valid email
 * - Password: Required, non-empty
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

/**
 * Schema for updating user profile
 * - Display Name: Optional, max 100 characters, trimmed
 * - Rejects whitespace-only strings
 */
export const updateProfileSchema = z.object({
  displayName: z.string()
    .max(100, 'Display name must not exceed 100 characters')
    .transform(val => val?.trim())
    .refine(val => val && val.length > 0, {
      message: 'Display name cannot be empty or whitespace only'
    })
    .optional()
});

// ============================================================================
// FLASHCARD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new flashcard (manual)
 * - Front: Required, 1-1000 characters after trim
 * - Back: Required, 1-2000 characters after trim
 */
export const createFlashcardSchema = z.object({
  front: z.string()
    .min(1, 'Front text is required')
    .transform(s => s.trim())
    .pipe(z.string()
      .min(1, 'Front text cannot be empty after trimming')
      .max(1000, 'Front text must not exceed 1000 characters')
    ),
  back: z.string()
    .min(1, 'Back text is required')
    .transform(s => s.trim())
    .pipe(z.string()
      .min(1, 'Back text cannot be empty after trimming')
      .max(2000, 'Back text must not exceed 2000 characters')
    )
});

/**
 * Schema for updating a flashcard
 * - At least one field (front or back) must be provided
 * - Same validation rules as create
 */
export const updateFlashcardSchema = z.object({
  front: z.string()
    .transform(s => s.trim())
    .pipe(z.string()
      .min(1, 'Front text cannot be empty after trimming')
      .max(1000, 'Front text must not exceed 1000 characters')
    )
    .optional(),
  back: z.string()
    .transform(s => s.trim())
    .pipe(z.string()
      .min(1, 'Back text cannot be empty after trimming')
      .max(2000, 'Back text must not exceed 2000 characters')
    )
    .optional()
}).refine(data => data.front !== undefined || data.back !== undefined, {
  message: 'At least one field (front or back) must be provided'
});

/**
 * Schema for reviewing a flashcard (SM-2 algorithm)
 * - Quality: Integer 0-5 (SM-2 quality scale)
 */
export const reviewCardSchema = z.object({
  quality: z.number()
    .int('Quality must be an integer')
    .min(0, 'Quality must be between 0 and 5')
    .max(5, 'Quality must be between 0 and 5')
});

// ============================================================================
// AI GENERATION SCHEMAS
// ============================================================================

/**
 * Schema for generating flashcards from text
 * - Input Text: 1000-10000 characters (enforces meaningful content)
 * - Model: Optional, defaults to Claude 3.5 Sonnet
 */
export const generateSchema = z.object({
  inputText: z.string()
    .min(1, 'Input text is required')
    .transform(s => s.trim())
    .pipe(z.string()
      .min(1000, 'Input text must be at least 1000 characters')
      .max(10000, 'Input text must not exceed 10000 characters')
    ),
  model: z.string()
    .optional()
    .default('anthropic/claude-3-5-sonnet')
});

/**
 * Schema for accepting generated flashcards
 * - Cards: Array of generated cards with temp IDs
 * - Each card must have front and back text
 * - User can edit cards before accepting
 */
export const acceptCardsSchema = z.object({
  cards: z.array(z.object({
    id: z.string().uuid('Invalid card ID format'),
    front: z.string()
      .min(1, 'Front text is required')
      .transform(s => s.trim())
      .pipe(z.string()
        .min(1, 'Front text cannot be empty')
        .max(1000, 'Front text must not exceed 1000 characters')
      ),
    back: z.string()
      .min(1, 'Back text is required')
      .transform(s => s.trim())
      .pipe(z.string()
        .min(1, 'Back text cannot be empty')
        .max(2000, 'Back text must not exceed 2000 characters')
      )
  }))
  .min(0, 'Cards array is required (can be empty to reject all)')
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Base pagination schema for list endpoints
 * - Page: Positive integer, default 1
 * - Limit: 1-100, default 20
 */
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .positive('Page must be positive')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20)
});

/**
 * Schema for listing flashcards with filters
 * - Pagination: page, limit
 * - Source: Optional filter by ai_generated or manual
 * - Sort: field:direction format (created_at:desc by default)
 */
export const flashcardsListSchema = paginationSchema.extend({
  source: z.enum(['ai_generated', 'manual'], {
    errorMap: () => ({ message: 'Source must be either "ai_generated" or "manual"' })
  }).optional(),
  sort: z.string()
    .regex(
      /^(created_at|updated_at|front|next_review_date):(asc|desc)$/,
      'Sort must be in format "field:direction" (e.g., "created_at:desc")'
    )
    .default('created_at:desc')
});

/**
 * Schema for listing generation sessions with filters
 * - Pagination: page, limit
 * - Status: Optional filter by success, failed, or partial
 */
export const sessionsListSchema = paginationSchema.extend({
  status: z.enum(['success', 'failed', 'partial'], {
    errorMap: () => ({ message: 'Status must be "success", "failed", or "partial"' })
  }).optional()
});

/**
 * Schema for cards due for review
 * - Limit: 1-100, default 20
 */
export const cardsDueSchema = z.object({
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20)
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;
export type ReviewCardInput = z.infer<typeof reviewCardSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
export type AcceptCardsInput = z.infer<typeof acceptCardsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type FlashcardsListInput = z.infer<typeof flashcardsListSchema>;
export type SessionsListInput = z.infer<typeof sessionsListSchema>;
export type CardsDueInput = z.infer<typeof cardsDueSchema>;

