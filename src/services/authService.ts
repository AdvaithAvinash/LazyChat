import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { firebaseAuth, FieldValue, firestoreDb } from '@/config/firebase';
import type { UserProfile } from '@/types';

/**
 * Kicks off Firebase Phone Auth. Firebase sends the SMS OTP itself (no
 * custom backend needed) and returns a confirmation handle used to verify
 * the code the user types in.
 */
export async function sendOtp(phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> {
  return firebaseAuth.signInWithPhoneNumber(phoneNumber);
}

export async function confirmOtp(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string
): Promise<FirebaseAuthTypes.UserCredential | null> {
  return confirmation.confirm(code);
}

export function subscribeToAuthState(callback: (user: FirebaseAuthTypes.User | null) => void) {
  return firebaseAuth.onAuthStateChanged(callback);
}

export async function signOut() {
  return firebaseAuth.signOut();
}

export function getCurrentUserId(): string | null {
  return firebaseAuth.currentUser?.uid ?? null;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await firestoreDb.collection('users').doc(uid).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

export async function createOrUpdateUserProfile(
  uid: string,
  phoneNumber: string,
  fields: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'about'>>
): Promise<void> {
  const ref = firestoreDb.collection('users').doc(uid);
  const existing = await ref.get();

  await ref.set(
    {
      uid,
      phoneNumber,
      ...fields,
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );
}

export async function isProfileComplete(uid: string): Promise<boolean> {
  const profile = await fetchUserProfile(uid);
  return Boolean(profile?.displayName);
}
