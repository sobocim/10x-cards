/**
 * GET /api/auth/user - Get Current User Endpoint
 * 
 * Returns the currently authenticated user with their profile data.
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Success Response (200 OK):
 * - id: string (user UUID)
 * - email: string
 * - profile: ProfileResponse object
 * 
 * Error Responses:
 * - 401 Unauthorized: Invalid or expired token
 * - 404 Not Found: User profile doesn't exist
 * - 500 Internal Server Error: Database query failed
 */

import type { APIRoute } from 'astro';
import { getProfile } from '../../../lib/services/profileService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

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

    // Step 2: Fetch user profile
    const profile = await getProfile(user.id);

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'User profile not found'
          }
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 3: Combine user data with profile
    const response = {
      id: user.id,
      email: user.email!,
      profile: {
        displayName: profile.displayName,
        totalCardsCreated: profile.totalCardsCreated,
        totalCardsGeneratedByAI: profile.totalCardsGeneratedByAI,
        dailyGenerationCount: profile.dailyGenerationCount,
        lastGenerationDate: profile.lastGenerationDate
      }
    };

    // Step 4: Return combined response
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Get current user endpoint error', error);
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

