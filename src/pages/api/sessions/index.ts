/**
 * GET /api/sessions - List Generation Sessions
 * 
 * Returns paginated list of user's generation sessions with optional filtering.
 * Sessions are ordered by creation date (newest first).
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Query Parameters:
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 * - status: 'success' | 'failed' | 'partial' (optional)
 * 
 * Success Response (200 OK):
 * - data: GenerationSessionResponse[] (sessions with metadata)
 * - pagination: { page, limit, total, totalPages }
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid query parameters
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Database error
 */

import type { APIRoute } from 'astro';
import { listSessions } from '../../../lib/services/generationService';
import { sessionsListSchema } from '../../../lib/services/validationService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

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
    const validation = sessionsListSchema.safeParse(queryParams);
    
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

    // Step 3: Fetch generation sessions
    const result = await listSessions(user.id, validation.data);

    // Step 4: Return paginated response
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('List sessions endpoint error', error);
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

