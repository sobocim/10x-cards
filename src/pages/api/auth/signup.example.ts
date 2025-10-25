/**
 * Example Signup API Endpoint
 *
 * This endpoint handles user registration and automatically creates a profile.
 * This is necessary because Supabase doesn't allow triggers on auth.users.
 *
 * Usage:
 * 1. Rename this file to `signup.ts` (remove .example)
 * 2. Call from frontend: POST /api/auth/signup with { email, password }
 * 3. Profile will be automatically created
 *
 * See: .ai/troubleshooting-profile-creation.md for more details
 */

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";

// Create Supabase client with Service Role for bypassing RLS
// IMPORTANT: Use Service Role Key (from env), not anon key
const supabaseAdmin = createClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY, // Service Role Key (server-only!)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, displayName } = body;

    // Validate input
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for better UX
    });

    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({
          error: authError?.message || "Failed to create user",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Automatically create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      display_name: displayName || null,
      // Other fields will use default values
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);

      // Rollback: Delete the user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({
          error: "Failed to create user profile",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Success! Return user data
    return new Response(
      JSON.stringify({
        message: "User created successfully",
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * Alternative approach: Client-side signup with server-side profile creation
 *
 * If you prefer client-side auth but still need server-side profile creation:
 *
 * 1. Client calls supabase.auth.signUp({ email, password })
 * 2. On success, client immediately calls POST /api/auth/create-profile
 * 3. create-profile endpoint creates the profile
 *
 * This approach is simpler but requires two API calls.
 */
