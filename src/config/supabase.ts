import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/config/env';
import type { Database } from '@/types/database';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local — see README.md.'
  );
}

/**
 * Browser client — used by every service and client component. Session
 * cookies are also readable server-side (middleware.ts keeps them fresh),
 * but this app's data fetching is entirely client-driven, matching the
 * real-time-heavy nature of a chat app.
 */
export const supabase = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
