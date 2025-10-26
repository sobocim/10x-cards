/**
 * POST /api/auth/signup - User Registration Endpoint
 * 
 * Creates a new user account and automatically creates an associated profile.
 * This is the entry point for new users.
 * 
 * Request Body:
 * - email: string (required, valid email)
 * - password: string (required, 8-72 chars)
 * - displayName: string (optional, max 100 chars)
 * 
 * Success Response (201 Created):
 * - user: { id, email }
 * - session: { accessToken, refreshToken, expiresIn }
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid input (validation errors)
 * - 409 Conflict: Email already exists
 * - 500 Internal Server Error: Database or auth service error
 */

import type { APIRoute } from 'astro';
import { signupSchema } from '../../../lib/services/validationService';
import { signUp } from '../../../lib/services/authService';
import { logError, sanitizeMetadata } from '../../../lib/utils/errorLogger';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Step 1: Parse request body
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

    // Step 2: Validate input with Zod
    const validation = signupSchema.safeParse(body);
    
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

    // Step 3: Call auth service to create user and profile
    const result = await signUp(validation.data);

    // Step 4: Return success response
    return new Response(
      JSON.stringify(result),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Handle specific error cases
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Email already exists (Supabase returns this)
    if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'CONFLICT',
            message: 'User with this email already exists'
          }
        }),
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Profile creation failed
    if (errorMessage.includes('profile')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create user profile'
          }
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generic error
    logError('Signup endpoint error', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during registration'
        }
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

