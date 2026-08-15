import { firestoreDb, realtimeDb, ServerValue } from '@/config/firebase';
import type { Presence } from '@/types';

/**
 * Classic Firebase presence pattern: Realtime Database's onDisconnect()
 * handler is the only reliable way to detect an app being killed, backgrounded
 * without cleanup, or losing network — Firestore has no equivalent. We mirror
 * every RTDB presence change into Firestore (via a change listener below) so
 * the rest of the app (chat lists, profile screens) can just read presence
 * from Firestore alongside everything else instead of juggling two databases.
 */
export function startPresenceTracking(uid: string): () => void {
  const statusRef = realtimeDb.ref(`/status/${uid}`);
  const connectedRef = realtimeDb.ref('.info/connected');
  const userDocRef = firestoreDb.collection('users').doc(uid);

  const onConnectedChange = connectedRef.on('value', async (snapshot) => {
    if (snapshot.val() === false) return;

    await statusRef.onDisconnect().set({
      state: 'offline',
      lastChanged: ServerValue.TIMESTAMP,
    });

    await statusRef.set({
      state: 'online',
      lastChanged: ServerValue.TIMESTAMP,
    });
  });

  const onStatusChange = statusRef.on('value', (snapshot) => {
    const value = snapshot.val() as { state: 'online' | 'offline'; lastChanged: number } | null;
    if (!value) return;
    userDocRef
      .set(
        { presence: { state: value.state, lastChanged: value.lastChanged } },
        { merge: true }
      )
      .catch(() => undefined);
  });

  return () => {
    connectedRef.off('value', onConnectedChange);
    statusRef.off('value', onStatusChange);
  };
}

export async function goOffline(uid: string): Promise<void> {
  await realtimeDb.ref(`/status/${uid}`).set({
    state: 'offline',
    lastChanged: ServerValue.TIMESTAMP,
  });
}

export function subscribeToPresence(uid: string, callback: (presence: Presence) => void) {
  const ref = firestoreDb.collection('users').doc(uid);
  return ref.onSnapshot((snap) => {
    const presence = (snap.data()?.presence as Presence | undefined) ?? {
      state: 'offline',
      lastChanged: 0,
    };
    callback(presence);
  });
}
