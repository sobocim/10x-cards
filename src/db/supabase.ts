/**
 * Supabase Client Configuration
 *
 * This file exports configured Supabase clients for use throughout the application.
 * It includes type-safe clients with the database schema.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Please add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to your .env file."
  );
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

/**
 * Default Supabase client with database types
 * Use this for server-side operations (API routes, server components)
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Create a Supabase client with custom auth token
 * Useful for server-side rendering with user context
 *
 * @param accessToken - JWT access token from user session
 * @returns Configured Supabase client
 */
export function createServerSupabaseClient(accessToken: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current authenticated user
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  return user;
}

/**
 * Get the current user's session
 * @returns Session object or null if not authenticated
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting current session:", error);
    return null;
  }

  return session;
}

/**
 * Check if user is authenticated
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// ============================================================================
// TYPE-SAFE TABLE ACCESSORS
// ============================================================================

/**
 * Type-safe accessor for profiles table
 */
export const profilesTable = () => supabase.from("profiles");

/**
 * Type-safe accessor for flashcards table
 */
export const flashcardsTable = () => supabase.from("flashcards");

/**
 * Type-safe accessor for generation_sessions table
 */
export const generationSessionsTable = () => supabase.from("generation_sessions");

// ============================================================================
// TYPE-SAFE FUNCTION CALLERS
// ============================================================================

/**
 * Call update_card_review function
 * Updates a flashcard after review using SM-2 algorithm
 *
 * @param cardId - UUID of the flashcard
 * @param quality - Review quality (0-5)
 * @returns Updated flashcard or error
 */
export async function updateCardReview(cardId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) {
  return await supabase.rpc("update_card_review", {
    card_uuid: cardId,
    quality,
  });
}

/**
 * Call get_cards_due_for_review function
 * Get flashcards that are due for review
 *
 * @param userId - UUID of the user
 * @param limit - Maximum number of cards to return (default: 20)
 * @returns Array of flashcards due for review or error
 */
export async function getCardsDueForReview(userId: string, limit = 20) {
  return await supabase.rpc("get_cards_due_for_review", {
    user_uuid: userId,
    limit_count: limit,
  });
}

/**
 * Call get_user_stats function
 * Get comprehensive statistics for a user
 *
 * @param userId - UUID of the user
 * @returns User statistics object or error
 */
export async function getUserStats(userId: string) {
  return await supabase.rpc("get_user_stats", {
    user_uuid: userId,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default supabase;
