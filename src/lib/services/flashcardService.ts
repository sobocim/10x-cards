/**
 * Flashcard Service
 *
 * Handles flashcard operations:
 * - List flashcards with pagination, filtering, and sorting
 * - CRUD operations (create, read, update, delete)
 * - Get cards due for review (SM-2 algorithm)
 * - Review flashcard (update SM-2 parameters)
 *
 * Transforms database responses from snake_case to camelCase for API responses.
 */

import { supabase } from "../../db/supabase";
import type {
  FlashcardsListParams,
  FlashcardsListResponse,
  FlashcardResponse,
  CreateFlashcardRequest,
  UpdateFlashcardRequest,
  CardsDueResponse,
  PaginationMeta,
} from "../../types";
import type { Flashcard, CardDueForReview } from "../../db/types";
import { logError } from "../utils/errorLogger";

/**
 * Transforms database flashcard (snake_case) to API response (camelCase)
 */
function transformFlashcard(flashcard: Flashcard): FlashcardResponse {
  return {
    id: flashcard.id,
    userId: flashcard.user_id,
    generationSessionId: flashcard.generation_session_id,
    front: flashcard.front,
    back: flashcard.back,
    source: flashcard.source,
    easeFactor: flashcard.ease_factor,
    intervalDays: flashcard.interval_days,
    repetitions: flashcard.repetitions,
    nextReviewDate: flashcard.next_review_date,
    lastReviewedAt: flashcard.last_reviewed_at,
    createdAt: flashcard.created_at,
    updatedAt: flashcard.updated_at,
  };
}

/**
 * Transforms database card due for review to API response
 */
function transformCardDue(card: CardDueForReview): CardDueForReview {
  // Already in correct format from RPC function
  return card;
}

/**
 * Lists user's flashcards with pagination, filtering, and sorting
 *
 * @param userId - UUID of the user
 * @param params - Query parameters (page, limit, source, sort)
 * @returns Paginated list of flashcards with metadata
 * @throws Error if query fails
 */
export async function listFlashcards(userId: string, params: FlashcardsListParams): Promise<FlashcardsListResponse> {
  try {
    const { page, limit, source, sort } = params;

    // Parse sort parameter (format: "field:direction")
    const [sortField, sortDirection] = sort.split(":") as [string, "asc" | "desc"];

    // Build query
    let query = supabase.from("flashcards").select("*", { count: "exact" }).eq("user_id", userId);

    // Apply source filter if provided
    if (source) {
      query = query.eq("source", source);
    }

    // Apply sorting
    query = query.order(sortField, { ascending: sortDirection === "asc" });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      logError("Flashcards list query failed", error, { userId, params });
      throw new Error("Failed to fetch flashcards");
    }

    // Transform data
    const flashcards = (data || []).map(transformFlashcard);

    // Calculate pagination metadata
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
    };

    return {
      data: flashcards,
      pagination,
    };
  } catch (error) {
    logError("List flashcards service error", error, { userId, params });
    throw error;
  }
}

/**
 * Retrieves a single flashcard by ID
 *
 * @param id - UUID of the flashcard
 * @returns FlashcardResponse or null if not found
 * @throws Error if query fails
 */
export async function getFlashcard(id: string): Promise<FlashcardResponse | null> {
  try {
    const { data, error } = await supabase.from("flashcards").select("*").eq("id", id).single();

    if (error) {
      // Not found is not an error for logging
      if (error.code === "PGRST116") {
        return null;
      }
      logError("Flashcard query failed", error, { flashcardId: id });
      throw new Error("Failed to fetch flashcard");
    }

    if (!data) {
      return null;
    }

    return transformFlashcard(data);
  } catch (error) {
    logError("Get flashcard service error", error, { flashcardId: id });
    throw error;
  }
}

/**
 * Creates a new flashcard manually (not AI-generated)
 *
 * @param userId - UUID of the user
 * @param data - Flashcard content (front, back)
 * @returns Created flashcard
 * @throws Error if creation fails
 */
export async function createFlashcard(userId: string, data: CreateFlashcardRequest): Promise<FlashcardResponse> {
  try {
    const { data: created, error } = await supabase
      .from("flashcards")
      .insert({
        user_id: userId,
        front: data.front,
        back: data.back,
        source: "manual",
        generation_session_id: null,
        // SM-2 defaults (ease_factor, interval_days, repetitions, next_review_date)
        // are set by database defaults - no need to specify them here
      })
      .select()
      .single();

    if (error) {
      logError("Flashcard creation failed", error, { userId });
      throw new Error("Failed to create flashcard");
    }

    if (!created) {
      throw new Error("Flashcard creation returned no data");
    }

    // Database trigger automatically updates profile statistics

    return transformFlashcard(created);
  } catch (error) {
    logError("Create flashcard service error", error, { userId });
    throw error;
  }
}

/**
 * Updates a flashcard's front and/or back text
 *
 * @param id - UUID of the flashcard
 * @param data - Updated content (front and/or back)
 * @returns Updated flashcard
 * @throws Error if update fails or flashcard not found
 */
export async function updateFlashcard(id: string, data: UpdateFlashcardRequest): Promise<FlashcardResponse> {
  try {
    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.front !== undefined) {
      updateData.front = data.front;
    }

    if (data.back !== undefined) {
      updateData.back = data.back;
    }

    const { data: updated, error } = await supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logError("Flashcard update failed", error, { flashcardId: id });
      throw new Error("Failed to update flashcard");
    }

    if (!updated) {
      throw new Error("Flashcard not found");
    }

    return transformFlashcard(updated);
  } catch (error) {
    logError("Update flashcard service error", error, { flashcardId: id });
    throw error;
  }
}

/**
 * Deletes a flashcard permanently
 *
 * @param id - UUID of the flashcard
 * @throws Error if deletion fails or flashcard not found
 */
export async function deleteFlashcard(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);

    if (error) {
      logError("Flashcard deletion failed", error, { flashcardId: id });
      throw new Error("Failed to delete flashcard");
    }

    // Database trigger automatically updates profile statistics
  } catch (error) {
    logError("Delete flashcard service error", error, { flashcardId: id });
    throw error;
  }
}

/**
 * Retrieves flashcards due for review based on SM-2 algorithm
 * Calls the get_cards_due_for_review() database function
 *
 * @param userId - UUID of the user
 * @param limit - Maximum number of cards to return (1-100)
 * @returns List of cards due for review
 * @throws Error if RPC call fails
 */
export async function getCardsDue(userId: string, limit: number): Promise<CardsDueResponse> {
  try {
    const { data, error } = await supabase.rpc("get_cards_due_for_review", {
      user_uuid: userId,
      limit_count: limit,
    });

    if (error) {
      logError("Cards due RPC failed", error, { userId, limit });
      throw new Error("Failed to fetch cards due for review");
    }

    const cards = (data || []).map(transformCardDue);

    return {
      data: cards,
      count: cards.length,
    };
  } catch (error) {
    logError("Get cards due service error", error, { userId, limit });
    throw error;
  }
}

/**
 * Reviews a flashcard and updates SM-2 algorithm parameters
 * Calls the update_card_review() database function
 *
 * @param id - UUID of the flashcard
 * @param quality - Quality rating (0-5)
 * @returns Updated flashcard with new SM-2 parameters
 * @throws Error if RPC call fails or flashcard not found
 */
export async function reviewCard(id: string, quality: number): Promise<FlashcardResponse> {
  try {
    const { data, error } = await supabase.rpc("update_card_review", {
      card_uuid: id,
      quality: quality,
    });

    if (error) {
      logError("Review card RPC failed", error, { flashcardId: id, quality });
      throw new Error("Failed to review flashcard");
    }

    if (!data) {
      throw new Error("Flashcard not found");
    }

    return transformFlashcard(data);
  } catch (error) {
    logError("Review card service error", error, { flashcardId: id, quality });
    throw error;
  }
}
