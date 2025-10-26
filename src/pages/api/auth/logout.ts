/**
 * POST /api/auth/logout - User Logout Endpoint
 * 
 * Invalidates the current session and logs the user out.
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Success Response (204 No Content):
 * - Empty response body
 * 
 * Error Responses:
 * - 401 Unauthorized: Invalid or missing token
 * - 500 Internal Server Error: Signout failed
 */

import type { APIRoute } from 'astro';
import { signOut } from '../../../lib/services/authService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
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

    // Step 2: Sign out user
    await signOut();

    // Step 3: Return success (204 No Content)
    return new Response(null, { status: 204 });

  } catch (error) {
    logError('Logout endpoint error', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during logout'
        }
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

