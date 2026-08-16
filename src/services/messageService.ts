import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { FieldValue, firestoreDb } from '@/config/firebase';
import type { Chat, Message, MessageType } from '@/types';

function messageFromDoc(doc: FirebaseFirestoreTypes.DocumentSnapshot): Message {
  const data = doc.data() as Omit<Message, 'id'>;
  return { id: doc.id, ...data };
}

export type SendMessageInput = {
  chatId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
};

export async function sendMessage(input: SendMessageInput, chat: Chat): Promise<void> {
  const chatRef = firestoreDb.collection('chats').doc(input.chatId);
  const messageRef = chatRef.collection('messages').doc();

  const message: Omit<Message, 'id'> = {
    chatId: input.chatId,
    senderId: input.senderId,
    type: input.type,
    text: input.text ?? null,
    mediaUrl: input.mediaUrl ?? null,
    mediaType: input.mediaType ?? null,
    fileName: input.fileName ?? null,
    createdAt: Date.now(),
    status: 'sent',
    readBy: [input.senderId],
  };

  const batch = firestoreDb.batch();
  batch.set(messageRef, { ...message, createdAt: FieldValue.serverTimestamp() });

  const unreadCount: Record<string, number> = { ...(chat.unreadCount ?? {}) };
  for (const uid of chat.participants) {
    if (uid !== input.senderId) unreadCount[uid] = (unreadCount[uid] ?? 0) + 1;
  }

  batch.set(
    chatRef,
    {
      lastMessage: {
        text: previewText(input),
        senderId: input.senderId,
        createdAt: FieldValue.serverTimestamp(),
        type: input.type,
      },
      unreadCount,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

function previewText(input: SendMessageInput): string {
  if (input.type === 'text') return input.text ?? '';
  if (input.type === 'image') return '📷 Photo';
  if (input.type === 'video') return '🎬 Video';
  if (input.type === 'audio') return '🎤 Voice message';
  return `📎 ${input.fileName ?? 'File'}`;
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  pageSize = 50
) {
  return firestoreDb
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(pageSize)
    .onSnapshot((snapshot) => {
      callback(snapshot.docs.map(messageFromDoc).reverse());
    });
}

export async function markMessagesRead(chatId: string, uid: string, messageIds: string[]) {
  if (messageIds.length === 0) return;
  const batch = firestoreDb.batch();
  const chatRef = firestoreDb.collection('chats').doc(chatId);

  for (const id of messageIds) {
    batch.set(
      chatRef.collection('messages').doc(id),
      { status: 'read', readBy: FieldValue.arrayUnion(uid) },
      { merge: true }
    );
  }

  batch.set(chatRef, { unreadCount: { [uid]: 0 } }, { merge: true });
  await batch.commit();
}
