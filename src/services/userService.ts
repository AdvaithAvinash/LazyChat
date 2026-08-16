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

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function savePushSubscription(uid: string, subscription: PushSubscriptionKeys): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: uid, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth },
      { onConflict: 'endpoint' }
    );
  if (error) throw error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) throw error;
}
