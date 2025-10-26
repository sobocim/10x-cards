/**
 * POST /api/flashcards/[id]/review - Review Flashcard (SM-2 Algorithm)
 * 
 * Records a review of a flashcard and updates SM-2 algorithm parameters.
 * Calls the update_card_review() database function.
 * 
 * Quality Scale:
 * - 0: Complete blackout
 * - 1: Incorrect, but answer seemed familiar
 * - 2: Incorrect, but easy to recall
 * - 3: Correct with difficulty
 * - 4: Correct after hesitation
 * - 5: Perfect response
 * 
 * SM-2 Algorithm (handled by database function):
 * - Quality >= 3: Increment repetitions, calculate new interval and ease factor
 * - Quality < 3: Reset to repetitions=0, interval=1 day
 * - Ease factor minimum: 1.3
 */

import type { APIRoute } from 'astro';
import { reviewCard } from '../../../../lib/services/flashcardService';
import { reviewCardSchema } from '../../../../lib/services/validationService';
import { logError } from '../../../../lib/utils/errorLogger';

export const prerender = false;

/**
 * POST /api/flashcards/[id]/review - Review Flashcard Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * URL Parameters:
 * - id: string (flashcard UUID)
 * 
 * Request Body:
 * - quality: number (required, integer 0-5)
 * 
 * Success Response (200 OK):
 * - Updated FlashcardResponse with new SM-2 parameters:
 *   - easeFactor: updated based on quality
 *   - intervalDays: next interval (1 day, 6 days, or interval * EF)
 *   - repetitions: incremented or reset
 *   - nextReviewDate: calculated from interval
 *   - lastReviewedAt: current timestamp
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid quality (not 0-5)
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Flashcard not found
 * - 500 Internal Server Error: Database error
 */
export const POST: APIRoute = async ({ request, params, locals }) => {
  try {
    // Step 1: Verify authentication
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated'
          }
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 2: Extract ID from URL params
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Flashcard ID is required'
          }
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 3: Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body'
          }
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 4: Validate quality with Zod
    const validation = reviewCardSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid quality value. Must be an integer between 0 and 5',
            details: validation.error.flatten().fieldErrors
          }
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 5: Review flashcard (calls database RPC function)
    const updatedFlashcard = await reviewCard(id, validation.data.quality);

    // Step 6: Return updated flashcard with new SM-2 parameters
    return new Response(
      JSON.stringify(updatedFlashcard),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Flashcard not found'
          }
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    logError('Review flashcard endpoint error', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

