/**
 * GET /api/flashcards - List User Flashcards
 * POST /api/flashcards - Create Flashcard (Manual)
 * 
 * Handles flashcard listing and creation:
 * - GET: Returns paginated list with filtering and sorting
 * - POST: Creates a new manual flashcard
 */

import type { APIRoute } from 'astro';
import { 
  listFlashcards, 
  createFlashcard 
} from '../../../lib/services/flashcardService';
import { 
  flashcardsListSchema, 
  createFlashcardSchema 
} from '../../../lib/services/validationService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

/**
 * GET /api/flashcards - List User Flashcards Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Query Parameters:
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 * - source: 'ai_generated' | 'manual' (optional)
 * - sort: string (optional, default: 'created_at:desc')
 * 
 * Success Response (200 OK):
 * - data: FlashcardResponse[]
 * - pagination: { page, limit, total, totalPages }
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid query parameters
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Database error
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
    const validation = flashcardsListSchema.safeParse(queryParams);
    
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

    // Step 3: Fetch flashcards
    const result = await listFlashcards(user.id, validation.data);

    // Step 4: Return paginated response
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('List flashcards endpoint error', error);
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
 * POST /api/flashcards - Create Flashcard (Manual) Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Request Body:
 * - front: string (required, 1-1000 chars)
 * - back: string (required, 1-2000 chars)
 * 
 * Success Response (201 Created):
 * - Created FlashcardResponse
 * 
 * Error Responses:
 * - 400 Bad Request: Validation errors (empty or too long)
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Database error
 */
export const POST: APIRoute = async ({ request, locals }) => {
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

    // Step 2: Parse request body
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

    // Step 3: Validate input with Zod
    const validation = createFlashcardSchema.safeParse(body);
    
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

    // Step 4: Create flashcard
    const flashcard = await createFlashcard(user.id, validation.data);

    // Step 5: Return created flashcard
    return new Response(
      JSON.stringify(flashcard),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Create flashcard endpoint error', error);
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

