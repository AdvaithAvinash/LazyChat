import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

type ChatDoc = {
  participants: string[];
  type: 'direct' | 'group';
  groupName?: string;
  participantDetails: Record<string, { displayName: string; photoURL: string | null }>;
};

type MessageDoc = {
  senderId: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio';
  text: string | null;
  fileName: string | null;
};

function notificationBody(message: MessageDoc): string {
  switch (message.type) {
    case 'text':
      return message.text ?? '';
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎬 Video';
    case 'audio':
      return '🎤 Voice message';
    default:
      return `📎 ${message.fileName ?? 'File'}`;
  }
}

/**
 * Sends a push notification to every other participant in a chat whenever a
 * new message is written. This is the piece that can't happen purely on the
 * client: FCM's send API requires a service-account-authenticated backend.
 */
export const onMessageCreated = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const message = snapshot.data() as MessageDoc;
    const { chatId } = event.params as { chatId: string };

    const chatSnap = await db.collection('chats').doc(chatId).get();
    if (!chatSnap.exists) return;
    const chat = chatSnap.data() as ChatDoc;

    const recipients = chat.participants.filter((uid) => uid !== message.senderId);
    if (recipients.length === 0) return;

    const senderName = chat.participantDetails[message.senderId]?.displayName ?? 'Someone';
    const title = chat.type === 'group' ? `${senderName} in ${chat.groupName ?? 'group'}` : senderName;
    const body = notificationBody(message);

    const usersSnap = await db.getAll(
      ...recipients.map((uid) => db.collection('users').doc(uid))
    );

    const tokens = usersSnap.flatMap((doc) => (doc.data()?.fcmTokens as string[] | undefined) ?? []);
    if (tokens.length === 0) return;

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { chatId, type: 'message' },
      android: { priority: 'high', notification: { channelId: 'messages' } },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    const staleTokens = response.responses
      .map((res, i) => (res.success ? null : tokens[i]))
      .filter((token): token is string => Boolean(token));

    await Promise.all(
      usersSnap.map((doc) => {
        const docTokens = (doc.data()?.fcmTokens as string[] | undefined) ?? [];
        const toRemove = docTokens.filter((t) => staleTokens.includes(t));
        if (toRemove.length === 0) return Promise.resolve();
        return doc.ref.update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...toRemove),
        });
      })
    );
  }
);

/** Notifies the callee when a new call document is created (rings the phone). */
export const onCallCreated = onDocumentCreated('calls/{callId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const call = snapshot.data() as {
    callerId: string;
    calleeId: string;
    type: 'voice' | 'video';
  };

  const [callerDoc, calleeDoc] = await db.getAll(
    db.collection('users').doc(call.callerId),
    db.collection('users').doc(call.calleeId)
  );

  const tokens = (calleeDoc.data()?.fcmTokens as string[] | undefined) ?? [];
  if (tokens.length === 0) return;

  const callerName = (callerDoc.data()?.displayName as string | undefined) ?? 'Someone';

  await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: `Incoming ${call.type} call`,
      body: `${callerName} is calling you`,
    },
    data: { type: 'call', callId: event.params.callId as string, callType: call.type },
    android: { priority: 'high', notification: { channelId: 'messages' } },
    apns: { payload: { aps: { sound: 'default' } } },
  });
});
