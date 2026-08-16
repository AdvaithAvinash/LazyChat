import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { env } from '@/config/env';
import type { Database } from '@/types/database';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env — see README.md.'
  );
}

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
