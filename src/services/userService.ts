import { FieldValue, firestoreDb } from '@/config/firebase';
import type { UserProfile } from '@/types';

/**
 * Looks up which of the given phone numbers (typically from the device's
 * contact list) already have a LazyChat account. Firestore has no native
 * "IN" batching beyond 30 values, so we chunk the lookups.
 */
export async function findRegisteredUsersByPhone(phoneNumbers: string[]): Promise<UserProfile[]> {
  const unique = Array.from(new Set(phoneNumbers)).filter(Boolean);
  if (unique.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) {
    chunks.push(unique.slice(i, i + 30));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      firestoreDb.collection('users').where('phoneNumber', 'in', chunk).get()
    )
  );

  return results.flatMap((snap) => snap.docs.map((doc) => doc.data() as UserProfile));
}

export async function updateFcmToken(uid: string, token: string): Promise<void> {
  await firestoreDb
    .collection('users')
    .doc(uid)
    .set({ fcmTokens: FieldValue.arrayUnion(token) }, { merge: true });
}

export async function removeFcmToken(uid: string, token: string): Promise<void> {
  await firestoreDb
    .collection('users')
    .doc(uid)
    .set({ fcmTokens: FieldValue.arrayRemove(token) }, { merge: true });
}
