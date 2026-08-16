import { supabase } from '@/config/supabase';
import type { Database } from '@/types/database';
import type { UserProfile } from '@/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export function profileRowToUserProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.avatar_url,
    about: row.about,
    createdAt: row.created_at,
    expoPushTokens: row.expo_push_tokens,
  };
}

export async function fetchProfilesByIds(uids: string[]): Promise<Map<string, UserProfile>> {
  const unique = Array.from(new Set(uids)).filter(Boolean);
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.from('profiles').select('*').in('id', unique);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, profileRowToUserProfile(row)]));
}

/** Searches the user directory by email or display name (used by "new chat"
 * since there's no phone-number contact list to match against anymore). */
export async function searchUsers(query: string, excludeUid: string): Promise<UserProfile[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
    .neq('id', excludeUid)
    .limit(20);

  if (error) throw error;
  return (data ?? []).map(profileRowToUserProfile);
}

export async function addExpoPushToken(uid: string, token: string): Promise<void> {
  const { data, error } = await supabase.from('profiles').select('expo_push_tokens').eq('id', uid).single();
  if (error) throw error;
  if (data.expo_push_tokens.includes(token)) return;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ expo_push_tokens: [...data.expo_push_tokens, token] })
    .eq('id', uid);
  if (updateError) throw updateError;
}

export async function removeExpoPushToken(uid: string, token: string): Promise<void> {
  const { data, error } = await supabase.from('profiles').select('expo_push_tokens').eq('id', uid).single();
  if (error) throw error;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ expo_push_tokens: data.expo_push_tokens.filter((t) => t !== token) })
    .eq('id', uid);
  if (updateError) throw updateError;
}
