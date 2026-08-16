export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  about: string;
  createdAt: string;
  expoPushTokens: string[];
};

export type PresenceState = 'online' | 'offline';

export type Presence = {
  state: PresenceState;
  lastChanged: number;
};

export type ChatType = 'direct' | 'group';

export type Chat = {
  id: string;
  type: ChatType;
  participants: string[];
  participantDetails: Record<string, { displayName: string; photoURL: string | null }>;
  groupName?: string | null;
  groupPhoto?: string | null;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: string;
    type: MessageType;
  } | null;
  unreadCount?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export type MessageType = 'text' | 'image' | 'file' | 'video' | 'audio';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  text: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  fileName: string | null;
  createdAt: string;
  status: MessageStatus;
  readBy: string[];
};

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';

export type Call = {
  id: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  type: CallType;
  status: CallStatus;
  createdAt: string;
  offer?: { sdp: string; type: string } | null;
  answer?: { sdp: string; type: string } | null;
};
