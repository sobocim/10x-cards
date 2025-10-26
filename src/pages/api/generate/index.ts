/**
 * POST /api/generate - Generate Flashcards from Text
 * 
 * Generates flashcard suggestions from user-provided text using AI (OpenRouter.ai).
 * Implements rate limiting: 2 generation sessions per day per user.
 * 
 * Request Body:
 * - inputText: string (required, 1000-10000 chars)
 * - model: string (optional, default: anthropic/claude-3-5-sonnet)
 * 
 * Success Response (200 OK):
 * - sessionId: string (generation session UUID)
 * - status: 'success'
 * - generatedCards: GeneratedCard[] (with temp UUIDs)
 * - generatedCount: number
 * - generationTimeMs: number
 * - tokensUsed: number
 * 
 * Error Responses:
 * - 400 Bad Request: Input text too short (<1000) or too long (>10000)
 * - 401 Unauthorized: Not authenticated
 * - 429 Too Many Requests: Daily generation limit exceeded (2 per day)
 * - 500 Internal Server Error: AI API error
 * - 503 Service Unavailable: AI API timeout (>30s)
 */

import type { APIRoute } from 'astro';
import { generateFromText } from '../../../lib/services/generationService';
import { generateSchema } from '../../../lib/services/validationService';
import { logError } from '../../../lib/utils/errorLogger';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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
    const validation = generateSchema.safeParse(body);
    
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

    // Step 4: Generate flashcards (includes rate limit check)
    const result = await generateFromText(user.id, validation.data);

    // Step 5: Return generated cards
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle rate limit exceeded
    if (errorMessage === 'RATE_LIMIT_EXCEEDED') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const secondsUntilReset = Math.floor((tomorrow.getTime() - Date.now()) / 1000);

      return new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Daily generation limit exceeded. You can generate 2 times per day.',
            details: {
              limit: 2,
              resetIn: secondsUntilReset
            }
          }
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': secondsUntilReset.toString()
          } 
        }
      );
    }

    // Handle AI API timeout
    if (errorMessage.includes('timeout')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI service timeout. Please try again with shorter text.'
          }
        }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle AI API errors
    if (errorMessage.includes('OpenRouter') || errorMessage.includes('API')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI service temporarily unavailable. Please try again later.'
          }
        }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generic error
    logError('Generate endpoint error', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during generation'
        }
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

