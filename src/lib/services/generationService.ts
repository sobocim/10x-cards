/**
 * Generation Service
 * 
 * Handles AI flashcard generation workflows:
 * - Generate flashcards from text (with rate limiting)
 * - Accept generated flashcards (bulk insert)
 * - List generation sessions (with pagination)
 * - Get single generation session (with flashcards)
 * 
 * Implements rate limiting: 2 generation sessions per day per user
 */

import { supabase } from '../../db/supabase';
import type {
  GenerateFlashcardsRequest,
  GenerateFlashcardsResponse,
  AcceptCardsRequest,
  AcceptCardsResponse,
  GenerationSessionsListParams,
  GenerationSessionsListResponse,
  GenerationSessionWithCards,
  GenerationSessionResponse,
  FlashcardResponse,
  PaginationMeta
} from '../../types';
import type { GenerationSession, Flashcard, Profile } from '../../db/types';
import { generateFlashcardsWithAI, validateGeneratedCards } from './openrouterService';
import { logError } from '../utils/errorLogger';

/**
 * Transforms database generation session to API response
 */
function transformSession(session: GenerationSession): GenerationSessionResponse {
  return {
    id: session.id,
    userId: session.user_id,
    inputText: session.input_text,
    generatedCount: session.generated_count,
    acceptedCount: session.accepted_count,
    rejectedCount: session.rejected_count,
    status: session.status,
    errorMessage: session.error_message,
    generationTimeMs: session.generation_time_ms,
    tokensUsed: session.tokens_used,
    modelUsed: session.model_used,
    createdAt: session.created_at
  };
}

/**
 * Transforms database flashcard to API response
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
    updatedAt: flashcard.updated_at
  };
}

/**
 * Checks if user has exceeded daily generation limit
 * Rate limit: 2 generations per day
 * 
 * @param profile - User's profile
 * @returns true if limit exceeded, false otherwise
 */
function checkRateLimit(profile: Profile): boolean {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // If last generation was today and count >= 2, limit exceeded
  if (profile.last_generation_date === today && profile.daily_generation_count >= 2) {
    return true;
  }

  return false;
}

/**
 * Generates flashcards from text using AI
 * 
 * Flow:
 * 1. Check rate limit (2 per day)
 * 2. Call OpenRouter.ai API
 * 3. Create generation session record
 * 4. Update profile (increment daily count, set last date)
 * 5. Return generated cards with session ID
 * 
 * @param userId - UUID of the user
 * @param data - Generation request (inputText, model)
 * @returns Generated cards with session metadata
 * @throws Error if rate limit exceeded or generation fails
 */
export async function generateFromText(
  userId: string,
  data: GenerateFlashcardsRequest
): Promise<GenerateFlashcardsResponse> {
  try {
    // Step 1: Get user profile and check rate limit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      logError('Profile fetch failed for generation', profileError, { userId });
      throw new Error('Failed to fetch user profile');
    }

    // Check rate limit
    if (checkRateLimit(profile)) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    // Step 2: Call AI service to generate flashcards
    const aiResult = await generateFlashcardsWithAI(
      data.inputText,
      data.model || 'anthropic/claude-3-5-sonnet'
    );

    // Validate generated cards
    validateGeneratedCards(aiResult.cards);

    // Step 3: Create generation session record
    const { data: session, error: sessionError } = await supabase
      .from('generation_sessions')
      .insert({
        user_id: userId,
        input_text: data.inputText,
        generated_count: aiResult.cards.length,
        accepted_count: 0,
        rejected_count: 0,
        status: 'success',
        error_message: null,
        generation_time_ms: aiResult.timeMs,
        tokens_used: aiResult.tokensUsed,
        model_used: data.model || 'anthropic/claude-3-5-sonnet'
      })
      .select()
      .single();

    if (sessionError || !session) {
      logError('Generation session creation failed', sessionError, { userId });
      throw new Error('Failed to create generation session');
    }

    // Step 4: Update profile - increment daily count, set last date
    const today = new Date().toISOString().split('T')[0];
    const newCount = profile.last_generation_date === today 
      ? profile.daily_generation_count + 1 
      : 1;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        daily_generation_count: newCount,
        last_generation_date: today
      })
      .eq('user_id', userId);

    if (updateError) {
      logError('Profile update failed after generation', updateError, { userId });
      // Don't throw - generation succeeded, this is just stats update
    }

    // Step 5: Return generated cards with session ID
    return {
      sessionId: session.id,
      status: 'success',
      generatedCards: aiResult.cards,
      generatedCount: aiResult.cards.length,
      generationTimeMs: aiResult.timeMs,
      tokensUsed: aiResult.tokensUsed
    };

  } catch (error) {
    // Handle rate limit error
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      throw error; // Re-throw as-is for endpoint to handle
    }

    // For other errors, create a failed session record
    try {
      await supabase
        .from('generation_sessions')
        .insert({
          user_id: userId,
          input_text: data.inputText,
          generated_count: 0,
          accepted_count: 0,
          rejected_count: 0,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          generation_time_ms: null,
          tokens_used: null,
          model_used: data.model || 'anthropic/claude-3-5-sonnet'
        });
    } catch (sessionError) {
      logError('Failed to create error session', sessionError, { userId });
    }

    logError('Generate from text service error', error, { userId });
    throw error;
  }
}

/**
 * Accepts generated flashcards and saves them to user's collection
 * 
 * Flow:
 * 1. Verify session exists and belongs to user
 * 2. Validate cards array
 * 3. Bulk insert flashcards
 * 4. Update session (accepted_count, rejected_count)
 * 5. Return created flashcards
 * 
 * @param userId - UUID of the user
 * @param sessionId - UUID of the generation session
 * @param data - Cards to accept (can be edited by user)
 * @returns Created flashcards with counts
 * @throws Error if session not found or insert fails
 */
export async function acceptCards(
  userId: string,
  sessionId: string,
  data: AcceptCardsRequest
): Promise<AcceptCardsResponse> {
  try {
    // Step 1: Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('generation_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      throw new Error('Generation session not found');
    }

    // Step 2: Calculate rejection count
    const acceptedCount = data.cards.length;
    const rejectedCount = session.generated_count - acceptedCount;

    // Step 3: Bulk insert flashcards (if any accepted)
    let createdFlashcards: Flashcard[] = [];

    if (acceptedCount > 0) {
      const flashcardsToInsert = data.cards.map(card => ({
        user_id: userId,
        generation_session_id: sessionId,
        front: card.front,
        back: card.back,
        source: 'ai_generated' as const,
        ease_factor: 2.5,
        interval_days: 0,
        repetitions: 0,
        next_review_date: new Date().toISOString()
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert)
        .select();

      if (insertError || !inserted) {
        logError('Flashcards bulk insert failed', insertError, { 
          userId, 
          sessionId, 
          count: acceptedCount 
        });
        throw new Error('Failed to save flashcards');
      }

      createdFlashcards = inserted;
    }

    // Step 4: Update generation session with counts
    const { error: updateError } = await supabase
      .from('generation_sessions')
      .update({
        accepted_count: acceptedCount,
        rejected_count: rejectedCount
      })
      .eq('id', sessionId);

    if (updateError) {
      logError('Session update failed after acceptance', updateError, { sessionId });
      // Don't throw - flashcards were created successfully
    }

    // Database triggers automatically update profile statistics

    // Step 5: Return created flashcards with counts
    return {
      sessionId,
      acceptedCount,
      rejectedCount,
      flashcards: createdFlashcards.map(transformFlashcard)
    };

  } catch (error) {
    logError('Accept cards service error', error, { userId, sessionId });
    throw error;
  }
}

/**
 * Lists user's generation sessions with pagination and filtering
 * 
 * @param userId - UUID of the user
 * @param params - Query parameters (page, limit, status)
 * @returns Paginated list of generation sessions
 * @throws Error if query fails
 */
export async function listSessions(
  userId: string,
  params: GenerationSessionsListParams
): Promise<GenerationSessionsListResponse> {
  try {
    const { page, limit, status } = params;

    // Build query
    let query = supabase
      .from('generation_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Sort by created_at DESC (newest first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      logError('Generation sessions list query failed', error, { userId, params });
      throw new Error('Failed to fetch generation sessions');
    }

    // Transform data
    const sessions = (data || []).map(transformSession);

    // Calculate pagination metadata
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages
    };

    return {
      data: sessions,
      pagination
    };

  } catch (error) {
    logError('List sessions service error', error, { userId, params });
    throw error;
  }
}

/**
 * Retrieves a single generation session with linked flashcards
 * 
 * @param id - UUID of the generation session
 * @returns Session with flashcards or null if not found
 * @throws Error if query fails
 */
export async function getSession(id: string): Promise<GenerationSessionWithCards | null> {
  try {
    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('generation_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return null;
      }
      logError('Generation session query failed', sessionError, { sessionId: id });
      throw new Error('Failed to fetch generation session');
    }

    if (!session) {
      return null;
    }

    // Fetch linked flashcards
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('id, front, back')
      .eq('generation_session_id', id);

    if (flashcardsError) {
      logError('Linked flashcards query failed', flashcardsError, { sessionId: id });
      // Don't throw - return session without flashcards
    }

    // Combine session with flashcards
    return {
      ...transformSession(session),
      flashcards: (flashcards || []).map(card => ({
        id: card.id,
        front: card.front,
        back: card.back
      }))
    };

  } catch (error) {
    logError('Get session service error', error, { sessionId: id });
    throw error;
  }
}

