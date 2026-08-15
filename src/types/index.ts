export type UserProfile = {
  uid: string;
  phoneNumber: string;
  displayName: string;
  photoURL: string | null;
  about: string;
  createdAt: number;
  fcmTokens: string[];
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
  groupName?: string;
  groupPhoto?: string | null;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: number;
    type: MessageType;
  } | null;
  unreadCount?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
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
  createdAt: number;
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
  createdAt: number;
  offer?: { sdp: string; type: string };
  answer?: { sdp: string; type: string };
};
