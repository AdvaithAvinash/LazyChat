import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  supabaseUrl: extra.supabaseUrl ?? process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? process.env.SUPABASE_ANON_KEY ?? '',
};
