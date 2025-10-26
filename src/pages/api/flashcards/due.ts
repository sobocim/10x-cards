/**
 * GET /api/flashcards/due - Get Cards Due for Review
 * 
 * Returns flashcards that are due for review based on SM-2 algorithm scheduling.
 * Calls the get_cards_due_for_review() database function.
 */

import type { APIRoute } from 'astro';
import { getCardsDue } from '../../../lib/services/flashcardService';
import { cardsDueSchema } from '../../../lib/services/validationService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

/**
 * GET /api/flashcards/due - Get Cards Due for Review Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Query Parameters:
 * - limit: number (optional, default: 20, max: 100)
 * 
 * Success Response (200 OK):
 * - data: CardDueForReview[] (cards with review metadata)
 * - count: number (total cards returned)
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid limit parameter
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Database error
 * 
 * Performance Note:
 * - Uses index on (user_id, next_review_date)
 * - No caching (real-time data)
 * - Response time: ~20-50ms
 */
export const GET: APIRoute = async ({ url, locals }) => {
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

    // Step 2: Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams);
    const validation = cardsDueSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.flatten().fieldErrors
          }
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 3: Fetch cards due for review
    const result = await getCardsDue(user.id, validation.data.limit);

    // Step 4: Return cards
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Get cards due endpoint error', error);
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

