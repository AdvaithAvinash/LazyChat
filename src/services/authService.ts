import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/config/supabase';
import { profileRowToUserProfile } from '@/services/userService';
import type { UserProfile } from '@/types';

export type SignUpResult = {
  user: User | null;
  /** true when the project requires email confirmation before a session is issued. */
  needsEmailConfirmation: boolean;
};

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  return { user: data.user, needsEmailConfirmation: data.session === null };
}

export async function signIn(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Mirrors Firebase's onAuthStateChanged: fires once immediately with the
 * current session, then again on every sign-in/sign-out/token refresh. */
export function subscribeToAuthState(callback: (user: User | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data ? profileRowToUserProfile(data) : null;
}

export async function createOrUpdateUserProfile(
  uid: string,
  email: string,
  fields: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'about'>>
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: uid,
      email,
      ...(fields.displayName !== undefined ? { display_name: fields.displayName } : {}),
      ...(fields.photoURL !== undefined ? { avatar_url: fields.photoURL } : {}),
      ...(fields.about !== undefined ? { about: fields.about } : {}),
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function isProfileComplete(uid: string): Promise<boolean> {
  const profile = await fetchUserProfile(uid);
  return Boolean(profile?.displayName);
}
