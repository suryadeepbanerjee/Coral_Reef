/**
 * src/lib/supabase.js
 * Singleton Supabase client. Returns null if env vars are missing so the
 * rest of the app can handle the missing-config case gracefully.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Feedback will not persist.');
}

export const supabase = url && key ? createClient(url, key) : null;
