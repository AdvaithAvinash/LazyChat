import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Avatar from '@/components/Avatar';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import type { Chat } from '@/types';
import { colors } from '@/theme/colors';
import { formatTimestamp } from '@/utils/format';

type Props = {
  chat: Chat;
  currentUserId: string;
  onPress: () => void;
};

export default function ChatListItem({ chat, currentUserId, onPress }: Props) {
  const otherUserId = chat.participants.find((id) => id !== currentUserId);
  const isGroup = chat.type === 'group';
  const title = isGroup
    ? chat.groupName ?? 'Group chat'
    : (otherUserId && chat.participantDetails[otherUserId]?.displayName) || 'Unknown';
  const photoURL = isGroup ? chat.groupPhoto : otherUserId ? chat.participantDetails[otherUserId]?.photoURL : null;
  const unread = chat.unreadCount?.[currentUserId] ?? 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.avatarWrap}>
        <Avatar name={title} photoURL={photoURL} />
        {!isGroup && otherUserId ? <OnlineStatusDot uid={otherUserId} /> : null}
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.time}>{formatTimestamp(chat.lastMessage?.createdAt ?? chat.updatedAt)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
            {chat.lastMessage
              ? `${chat.lastMessage.senderId === currentUserId ? 'You: ' : ''}${chat.lastMessage.text}`
              : 'Say hi 👋'}
          </Text>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  content: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  time: { color: colors.textMuted, fontSize: 12 },
  preview: { color: colors.textMuted, fontSize: 14, flexShrink: 1, marginTop: 2 },
  previewUnread: { color: colors.text, fontWeight: '500' },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: '700' },
});
