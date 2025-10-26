/**
 * Astro Middleware
 * 
 * Makes Supabase client available throughout the application via context.locals
 */

import { defineMiddleware } from 'astro:middleware';
import { supabase } from '../db/supabase';

export const onRequest = defineMiddleware((context, next) => {
  // Add Supabase client to context.locals
  context.locals.supabase = supabase;
  
  return next();
});

