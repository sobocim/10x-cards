/**
 * GET /api/sessions/[id] - Get Single Generation Session
 * 
 * Retrieves a single generation session with linked flashcards.
 * Shows which flashcards were created from this session.
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * URL Parameters:
 * - id: string (generation session UUID)
 * 
 * Success Response (200 OK):
 * - Complete GenerationSessionResponse
 * - flashcards: Array of linked flashcards (id, front, back only)
 * 
 * Error Responses:
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Session not found or doesn't belong to user
 * - 500 Internal Server Error: Database error
 */

import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/services/generationService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

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
            message: 'Session ID is required'
          }
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 3: Fetch session with flashcards
    const session = await getSession(id);

    if (!session) {
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

    // Step 4: Verify ownership (RLS should handle this, but extra check)
    if (session.userId !== user.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this session'
          }
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 5: Return session with flashcards
    return new Response(
      JSON.stringify(session),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Get session endpoint error', error);
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

