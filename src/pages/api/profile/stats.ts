/**
 * GET /api/profile/stats - Get User Statistics Endpoint
 * 
 * Returns comprehensive statistics calculated by the get_user_stats() database function.
 * Includes card counts, review stats, generation stats, and acceptance rates.
 * 
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 * 
 * Success Response (200 OK):
 * - totalCardsCreated: number
 * - totalCardsGeneratedByAI: number
 * - cardsDueToday: number
 * - totalReviewsCompleted: number
 * - totalGenerationSessions: number
 * - totalAcceptedCards: number
 * - averageAcceptanceRate: number (percentage)
 * - dailyGenerationCount: number
 * - lastGenerationDate: string | null
 * 
 * Error Responses:
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Database query failed
 * 
 * Performance Note:
 * - Response time: ~50-200ms depending on user's data volume
 * - Consider caching for 5 minutes in production
 */

import type { APIRoute } from 'astro';
import { getUserStats } from '../../../lib/services/profileService';
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

    // Step 2: Call database function to get stats
    const stats = await getUserStats(user.id);

    // Step 3: Return statistics
    // TODO: Add caching in production (Cache-Control header)
    return new Response(
      JSON.stringify(stats),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          // Uncomment for production caching:
          // 'Cache-Control': 'private, max-age=300' // 5 minutes
        } 
      }
    );

  } catch (error) {
    logError('Get user stats endpoint error', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while fetching statistics'
        }
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

