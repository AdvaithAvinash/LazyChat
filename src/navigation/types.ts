import type { CallType } from '@/types';

export type MainStackParamList = {
  Tabs: undefined;
  ChatRoom: { chatId: string };
  NewChat: undefined;
  Profile: undefined;
  Call: { chatId?: string; peerId: string; peerName: string; type: CallType; isCaller: boolean; callId?: string };
  IncomingCall: { callId: string; callerId: string; callerName: string; type: CallType };
};

export type MainTabParamList = {
  ChatsTab: undefined;
  ContactsTab: undefined;
  SettingsTab: undefined;
};
