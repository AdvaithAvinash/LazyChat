import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { FieldValue, firestoreDb } from '@/config/firebase';
import type { Chat, UserProfile } from '@/types';

function chatFromDoc(doc: FirebaseFirestoreTypes.DocumentSnapshot): Chat {
  const data = doc.data() as Omit<Chat, 'id'>;
  return { id: doc.id, ...data };
}

/** Finds an existing 1:1 chat between two users, or creates a new one. */
export async function getOrCreateDirectChat(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<string> {
  const existing = await firestoreDb
    .collection('chats')
    .where('type', '==', 'direct')
    .where('participants', 'array-contains', currentUser.uid)
    .get();

  const match = existing.docs.find((doc) => {
    const participants = (doc.data().participants as string[]) ?? [];
    return participants.includes(otherUser.uid) && participants.length === 2;
  });

  if (match) return match.id;

  const chatRef = firestoreDb.collection('chats').doc();
  await chatRef.set({
    type: 'direct',
    participants: [currentUser.uid, otherUser.uid],
    participantDetails: {
      [currentUser.uid]: { displayName: currentUser.displayName, photoURL: currentUser.photoURL },
      [otherUser.uid]: { displayName: otherUser.displayName, photoURL: otherUser.photoURL },
    },
    lastMessage: null,
    unreadCount: { [currentUser.uid]: 0, [otherUser.uid]: 0 },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return chatRef.id;
}

export function subscribeToUserChats(
  uid: string,
  callback: (chats: Chat[]) => void,
  onError?: (error: Error) => void
) {
  return firestoreDb
    .collection('chats')
    .where('participants', 'array-contains', uid)
    .orderBy('updatedAt', 'desc')
    .onSnapshot(
      (snapshot) => callback(snapshot.docs.map(chatFromDoc)),
      onError
    );
}

export function subscribeToChat(chatId: string, callback: (chat: Chat | null) => void) {
  return firestoreDb
    .collection('chats')
    .doc(chatId)
    .onSnapshot((doc) => callback(doc.exists ? chatFromDoc(doc) : null));
}

export async function markChatRead(chatId: string, uid: string) {
  await firestoreDb
    .collection('chats')
    .doc(chatId)
    .set({ unreadCount: { [uid]: 0 } }, { merge: true });
}
