/**
 * POST /api/generate/[sessionId]/accept - Accept Generated Flashcards
 * 
 * Saves selected AI-generated flashcards to the user's collection and updates session statistics.
 * User can edit cards before accepting them.
 * 
 * URL Parameters:
 * - sessionId: string (generation session UUID)
 * 
 * Request Body:
 * - cards: GeneratedCard[] (array of cards to accept, can be empty to reject all)
 *   - Each card: { id: string, front: string, back: string }
 *   - User can edit front/back before accepting
 * 
 * Success Response (201 Created):
 * - sessionId: string
 * - acceptedCount: number (cards accepted)
 * - rejectedCount: number (cards rejected)
 * - flashcards: FlashcardResponse[] (created flashcards with permanent UUIDs)
 * 
 * Error Responses:
 * - 400 Bad Request: Validation errors (invalid card content)
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Session not found or doesn't belong to user
 * - 500 Internal Server Error: Database error
 */

import type { APIRoute } from 'astro';
import { acceptCards } from '../../../../lib/services/generationService';
import { acceptCardsSchema } from '../../../../lib/services/validationService';
import { logError } from '../../../../lib/utils/errorLogger';

export const prerender = false;

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

    // Step 2: Extract sessionId from URL params
    const { sessionId } = params;
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Session ID is required'
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

    // Step 4: Validate cards array with Zod
    const validation = acceptCardsSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid card data',
            details: validation.error.flatten().fieldErrors
          }
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 5: Accept cards and create flashcards
    const result = await acceptCards(user.id, sessionId, validation.data);

    // Step 6: Return created flashcards with counts
    return new Response(
      JSON.stringify(result),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle session not found
    if (errorMessage.includes('not found')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Generation session not found'
          }
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle flashcard save errors
    if (errorMessage.includes('save')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to save flashcards'
          }
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generic error
    logError('Accept cards endpoint error', error);
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

