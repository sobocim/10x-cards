/**
 * GET /api/flashcards/[id] - Get Single Flashcard
 * PATCH /api/flashcards/[id] - Update Flashcard
 * DELETE /api/flashcards/[id] - Delete Flashcard
 * 
 * Handles individual flashcard operations by ID
 */

import type { APIRoute } from 'astro';
import { 
  getFlashcard, 
  updateFlashcard, 
  deleteFlashcard 
} from '../../../lib/services/flashcardService';
import { updateFlashcardSchema } from '../../../lib/services/validationService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

/**
 * GET /api/flashcards/[id] - Get Single Flashcard Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * URL Parameters:
 * - id: string (flashcard UUID)
 * 
 * Success Response (200 OK):
 * - Single FlashcardResponse
 * 
 * Error Responses:
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Flashcard doesn't exist or doesn't belong to user
 * - 500 Internal Server Error: Database error
 */
export const GET: APIRoute = async ({ params, locals }) => {
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

    // Step 3: Fetch flashcard
    const flashcard = await getFlashcard(id);

    if (!flashcard) {
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

    // Step 4: Verify ownership (RLS should handle this, but extra check)
    if (flashcard.userId !== user.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this flashcard'
          }
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 5: Return flashcard
    return new Response(
      JSON.stringify(flashcard),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Get flashcard endpoint error', error);
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

/**
 * PATCH /api/flashcards/[id] - Update Flashcard Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * URL Parameters:
 * - id: string (flashcard UUID)
 * 
 * Request Body:
 * - front: string (optional, 1-1000 chars)
 * - back: string (optional, 1-2000 chars)
 * - At least one field must be provided
 * 
 * Success Response (200 OK):
 * - Updated FlashcardResponse
 * 
 * Error Responses:
 * - 400 Bad Request: Validation errors
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Flashcard not found or doesn't belong to user
 * - 500 Internal Server Error: Database error
 */
export const PATCH: APIRoute = async ({ request, params, locals }) => {
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

    // Step 4: Validate input with Zod
    const validation = updateFlashcardSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validation.error.flatten().fieldErrors
          }
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 5: Update flashcard
    const updatedFlashcard = await updateFlashcard(id, validation.data);

    // Step 6: Return updated flashcard
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

    logError('Update flashcard endpoint error', error);
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

/**
 * DELETE /api/flashcards/[id] - Delete Flashcard Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * URL Parameters:
 * - id: string (flashcard UUID)
 * 
 * Success Response (204 No Content):
 * - Empty response body
 * 
 * Error Responses:
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Flashcard not found or doesn't belong to user
 * - 500 Internal Server Error: Database error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    // Step 3: Verify flashcard exists and belongs to user (optional, RLS handles this)
    const flashcard = await getFlashcard(id);
    
    if (!flashcard || flashcard.userId !== user.id) {
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

    // Step 4: Delete flashcard
    await deleteFlashcard(id);

    // Step 5: Return success (204 No Content)
    return new Response(null, { status: 204 });

  } catch (error) {
    logError('Delete flashcard endpoint error', error);
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

