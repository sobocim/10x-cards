/**
 * POST /api/auth/login - User Login Endpoint
 * 
 * Authenticates existing users and returns session tokens.
 * 
 * Request Body:
 * - email: string (required, valid email)
 * - password: string (required)
 * 
 * Success Response (200 OK):
 * - user: { id, email }
 * - session: { accessToken, refreshToken, expiresIn }
 * 
 * Error Responses:
 * - 400 Bad Request: Missing or invalid credentials
 * - 401 Unauthorized: Invalid credentials
 * - 500 Internal Server Error: Auth service error
 */

import type { APIRoute } from 'astro';
import { loginSchema } from '../../../lib/services/validationService';
import { signIn } from '../../../lib/services/authService';
import { logError } from '../../../lib/utils/errorLogger';

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
    const validation = loginSchema.safeParse(body);
    
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

    // Step 3: Call auth service to authenticate user
    const result = await signIn(validation.data);

    // Step 4: Return success response
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Handle specific error cases
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Invalid credentials (Supabase returns this)
    if (
      errorMessage.includes('Invalid login credentials') || 
      errorMessage.includes('invalid_credentials') ||
      errorMessage.includes('Email not confirmed')
    ) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password'
          }
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generic error
    logError('Login endpoint error', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during login'
        }
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

