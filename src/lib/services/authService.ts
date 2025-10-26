/**
 * Authentication Service
 * 
 * Handles user authentication operations:
 * - User registration (signup) with profile creation
 * - User login (signin) with session management
 * - User logout (signout)
 * 
 * Uses Supabase Auth for authentication and manages profile creation.
 */

import { supabase } from '../../db/supabase';
import type { 
  SignupRequest, 
  LoginRequest, 
  AuthResponse 
} from '../../types';
import { logError } from '../utils/errorLogger';

/**
 * Registers a new user and creates their profile
 * 
 * Flow:
 * 1. Sign up user with Supabase Auth
 * 2. Create profile record in profiles table
 * 3. Return user and session data
 * 
 * @param data - Signup request with email, password, and optional displayName
 * @returns AuthResponse with user and session data
 * @throws Error if signup or profile creation fails
 */
export async function signUp(data: SignupRequest): Promise<AuthResponse> {
  try {
    // Step 1: Create user account with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password
    });

    if (authError) {
      logError('Auth signup failed', authError, { email: data.email });
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    // Step 2: Create profile record
    // Note: This is critical as Supabase doesn't auto-create profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        display_name: data.displayName || null,
        total_cards_created: 0,
        total_cards_generated_by_ai: 0,
        daily_generation_count: 0,
        last_generation_date: null
      });

    if (profileError) {
      logError('Profile creation failed', profileError, { 
        userId: authData.user.id 
      });
      // Note: User account exists but profile creation failed
      // In production, consider cleanup or retry logic
      throw new Error('Failed to create user profile');
    }

    // Step 3: Return auth response
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!
      },
      session: authData.session ? {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresIn: authData.session.expires_in || 3600
      } : null
    };

  } catch (error) {
    logError('Signup service error', error, { email: data.email });
    throw error;
  }
}

/**
 * Authenticates an existing user
 * 
 * @param data - Login request with email and password
 * @returns AuthResponse with user and session data
 * @throws Error if authentication fails
 */
export async function signIn(data: LoginRequest): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (authError) {
      logError('Auth signin failed', authError, { email: data.email });
      throw new Error(authError.message);
    }

    if (!authData.user || !authData.session) {
      throw new Error('Authentication failed - no session returned');
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!
      },
      session: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresIn: authData.session.expires_in || 3600
      }
    };

  } catch (error) {
    logError('Signin service error', error, { email: data.email });
    throw error;
  }
}

/**
 * Logs out the current user and invalidates their session
 * 
 * @throws Error if signout fails
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logError('Auth signout failed', error);
      throw new Error(error.message);
    }

  } catch (error) {
    logError('Signout service error', error);
    throw error;
  }
}

