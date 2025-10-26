/**
 * Profile Service
 * 
 * Handles user profile operations:
 * - Get user profile
 * - Update user profile (display name)
 * - Get comprehensive user statistics
 * 
 * Transforms database responses from snake_case to camelCase for API responses.
 */

import { supabase } from '../../db/supabase';
import type { 
  ProfileResponse, 
  UpdateProfileRequest, 
  UserStatsResponse 
} from '../../types';
import type { Profile, UserStats } from '../../db/types';
import { logError } from '../utils/errorLogger';

/**
 * Transforms database profile (snake_case) to API response (camelCase)
 */
function transformProfile(profile: Profile): ProfileResponse {
  return {
    id: profile.id,
    userId: profile.user_id,
    displayName: profile.display_name,
    totalCardsCreated: profile.total_cards_created,
    totalCardsGeneratedByAI: profile.total_cards_generated_by_ai,
    dailyGenerationCount: profile.daily_generation_count,
    lastGenerationDate: profile.last_generation_date,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  };
}

/**
 * Transforms database user stats (snake_case) to API response (camelCase)
 */
function transformUserStats(stats: UserStats): UserStatsResponse {
  return {
    totalCardsCreated: stats.total_cards_created,
    totalCardsGeneratedByAI: stats.total_cards_generated_by_ai,
    cardsDueToday: stats.cards_due_today,
    totalReviewsCompleted: stats.total_reviews_completed,
    totalGenerationSessions: stats.total_generation_sessions,
    totalAcceptedCards: stats.total_accepted_cards,
    averageAcceptanceRate: stats.average_acceptance_rate,
    dailyGenerationCount: stats.daily_generation_count,
    lastGenerationDate: stats.last_generation_date
  };
}

/**
 * Retrieves a user's profile by user ID
 * 
 * @param userId - UUID of the user
 * @returns ProfileResponse or null if not found
 * @throws Error if database query fails
 */
export async function getProfile(userId: string): Promise<ProfileResponse | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Not found is not an error for logging purposes
      if (error.code === 'PGRST116') {
        return null;
      }
      logError('Profile query failed', error, { userId });
      throw new Error('Failed to fetch profile');
    }

    if (!data) {
      return null;
    }

    return transformProfile(data);

  } catch (error) {
    logError('Get profile service error', error, { userId });
    throw error;
  }
}

/**
 * Updates a user's profile
 * Currently only supports updating display_name
 * 
 * @param userId - UUID of the user
 * @param data - Update data (displayName)
 * @returns Updated ProfileResponse
 * @throws Error if update fails or profile not found
 */
export async function updateProfile(
  userId: string, 
  data: UpdateProfileRequest
): Promise<ProfileResponse> {
  try {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        display_name: data.displayName,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logError('Profile update failed', error, { userId });
      throw new Error('Failed to update profile');
    }

    if (!updated) {
      throw new Error('Profile not found');
    }

    return transformProfile(updated);

  } catch (error) {
    logError('Update profile service error', error, { userId });
    throw error;
  }
}

/**
 * Retrieves comprehensive user statistics
 * Calls the get_user_stats() database function which performs complex aggregations
 * 
 * Note: Consider caching this result for 5 minutes in production
 * 
 * @param userId - UUID of the user
 * @returns UserStatsResponse with all statistics
 * @throws Error if RPC call fails
 */
export async function getUserStats(userId: string): Promise<UserStatsResponse> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_stats', { user_uuid: userId });

    if (error) {
      logError('User stats RPC failed', error, { userId });
      throw new Error('Failed to fetch user statistics');
    }

    if (!data) {
      // Return default stats if no data (shouldn't happen with proper RPC)
      return {
        totalCardsCreated: 0,
        totalCardsGeneratedByAI: 0,
        cardsDueToday: 0,
        totalReviewsCompleted: 0,
        totalGenerationSessions: 0,
        totalAcceptedCards: 0,
        averageAcceptanceRate: 0,
        dailyGenerationCount: 0,
        lastGenerationDate: null
      };
    }

    return transformUserStats(data);

  } catch (error) {
    logError('Get user stats service error', error, { userId });
    throw error;
  }
}

