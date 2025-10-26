/**
 * GET /api/profile - Get User Profile
 * PATCH /api/profile - Update User Profile
 * 
 * Handles user profile operations:
 * - GET: Retrieves complete profile for authenticated user
 * - PATCH: Updates user's display name
 */

import type { APIRoute } from 'astro';
import { getProfile, updateProfile } from '../../../lib/services/profileService';
import { updateProfileSchema } from '../../../lib/services/validationService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

/**
 * GET /api/profile - Get User Profile Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Success Response (200 OK):
 * - Complete ProfileResponse object
 * 
 * Error Responses:
 * - 401 Unauthorized: Not authenticated
 * - 404 Not Found: Profile doesn't exist
 * - 500 Internal Server Error: Database error
 */
export const GET: APIRoute = async ({ locals }) => {
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

    // Step 2: Fetch profile
    const profile = await getProfile(user.id);

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Profile not found'
          }
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 3: Return profile
    return new Response(
      JSON.stringify(profile),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Get profile endpoint error', error);
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
 * PATCH /api/profile - Update User Profile Endpoint
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Request Body:
 * - displayName: string (optional, max 100 chars)
 * 
 * Success Response (200 OK):
 * - Updated ProfileResponse object
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid display name (empty or >100 chars)
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Update failed
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
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
    const validation = updateProfileSchema.safeParse(body);
    
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

    // Step 4: Update profile
    const updatedProfile = await updateProfile(user.id, validation.data);

    // Step 5: Return updated profile
    return new Response(
      JSON.stringify(updatedProfile),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Update profile endpoint error', error);
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

