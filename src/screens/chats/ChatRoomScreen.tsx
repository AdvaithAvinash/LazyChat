import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';

import Avatar from '@/components/Avatar';
import MessageBubble from '@/components/MessageBubble';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/types';
import { markMessagesRead, sendMessage, subscribeToMessages } from '@/services/messageService';
import { subscribeToChat } from '@/services/chatService';
import { pickDocument, pickImageFromLibrary } from '@/services/mediaPickerService';
import { uploadToCloudinary } from '@/services/storageService';
import { colors } from '@/theme/colors';
import type { Chat, Message } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type ChatRoomRoute = RouteProp<MainStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ChatRoomRoute>();
  const { chatId } = route.params;

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => subscribeToChat(chatId, setChat), [chatId]);
  useEffect(() => subscribeToMessages(chatId, setMessages), [chatId]);

  const otherUserId = useMemo(
    () => chat?.participants.find((id) => id !== profile?.uid),
    [chat, profile]
  );
  const otherUser = otherUserId ? chat?.participantDetails[otherUserId] : undefined;

  useEffect(() => {
    if (!profile || messages.length === 0) return;
    const unread = messages.filter((m) => m.senderId !== profile.uid && !m.readBy.includes(profile.uid));
    if (unread.length > 0) {
      markMessagesRead(chatId, profile.uid, unread.map((m) => m.id)).catch(() => undefined);
    }
  }, [messages, profile, chatId]);

  const handleSendText = async () => {
    if (!profile || !chat || text.trim().length === 0) return;
    const value = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage({ chatId, senderId: profile.uid, type: 'text', text: value }, chat);
    } finally {
      setSending(false);
    }
  };

  const handleAttachImage = async () => {
    if (!profile || !chat) return;
    const file = await pickImageFromLibrary();
    if (!file) return;
    await uploadAndSend(file, 'image', chat);
  };

  const handleAttachFile = async () => {
    if (!profile || !chat) return;
    const file = await pickDocument();
    if (!file) return;
    const type = file.mimeType.startsWith('video/') ? 'video' : 'file';
    await uploadAndSend(file, type, chat);
  };

  const uploadAndSend = async (
    file: { uri: string; name: string; mimeType: string },
    type: 'image' | 'video' | 'file',
    activeChat: Chat
  ) => {
    if (!profile) return;
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      await sendMessage(
        {
          chatId,
          senderId: profile.uid,
          type,
          mediaUrl: result.url,
          mediaType: result.mimeType,
          fileName: file.name,
        },
        activeChat
      );
    } finally {
      setUploading(false);
    }
  };

  const startCall = (callType: 'voice' | 'video') => {
    if (!otherUserId || !otherUser) return;
    navigation.navigate('Call', {
      chatId,
      peerId: otherUserId,
      peerName: otherUser.displayName,
      type: callType,
      isCaller: true,
    });
  };

  if (!profile || !chat) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Avatar name={otherUser?.displayName ?? 'Unknown'} photoURL={otherUser?.photoURL} size={36} />
          {otherUserId ? <OnlineStatusDot uid={otherUserId} /> : null}
        </View>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {chat.type === 'group' ? chat.groupName : otherUser?.displayName ?? 'Chat'}
        </Text>

        <TouchableOpacity onPress={() => startCall('voice')} style={styles.iconButton}>
          <Text style={styles.icon}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => startCall('video')} style={styles.iconButton}>
          <Text style={styles.icon}>🎥</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} isOwn={item.senderId === profile.uid} />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.messagesContent}
      />

      {uploading ? (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator color={colors.text} size="small" />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TouchableOpacity onPress={handleAttachFile} style={styles.composerIcon}>
          <Text style={styles.icon}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAttachImage} style={styles.composerIcon}>
          <Text style={styles.icon}>🖼️</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <TouchableOpacity
          onPress={handleSendText}
          disabled={sending || text.trim().length === 0}
          style={styles.sendButton}
        >
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4, marginRight: 4 },
  backText: { color: colors.text, fontSize: 22 },
  headerAvatar: { marginRight: 10 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '600', flex: 1 },
  iconButton: { padding: 6, marginLeft: 4 },
  icon: { fontSize: 18 },
  messagesContent: { paddingVertical: 12 },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  uploadingText: { color: colors.textMuted, marginLeft: 8, fontSize: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerIcon: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    maxHeight: 120,
    marginHorizontal: 4,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.text, fontSize: 16 },
});
