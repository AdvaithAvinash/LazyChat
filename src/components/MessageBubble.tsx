import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Message } from '@/types';
import { colors } from '@/theme/colors';
import { formatTimestamp } from '@/utils/format';

type Props = {
  message: Message;
  isOwn: boolean;
};

const statusIcon: Record<Message['status'], string> = {
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓',
};

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <MessageContent message={message} />
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTimestamp(message.createdAt)}</Text>
          {isOwn ? (
            <Text style={[styles.status, message.status === 'read' && styles.statusRead]}>
              {statusIcon[message.status]}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MessageContent({ message }: { message: Message }) {
  if (message.type === 'image' && message.mediaUrl) {
    return <Image source={{ uri: message.mediaUrl }} style={styles.image} resizeMode="cover" />;
  }

  if (message.type === 'video' && message.mediaUrl) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(message.mediaUrl as string)}>
        <View style={styles.filePill}>
          <Text style={styles.fileText}>🎬 {message.fileName ?? 'Video'}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if ((message.type === 'file' || message.type === 'audio') && message.mediaUrl) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(message.mediaUrl as string)}>
        <View style={styles.filePill}>
          <Text style={styles.fileText}>
            {message.type === 'audio' ? '🎤' : '📎'} {message.fileName ?? 'Attachment'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return <Text style={styles.text}>{message.text}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 12 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: { backgroundColor: colors.bubbleOutgoing, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bubbleIncoming, borderBottomLeftRadius: 4 },
  text: { color: colors.text, fontSize: 15 },
  image: { width: 220, height: 220, borderRadius: 10, marginBottom: 4 },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fileText: { color: colors.text, fontSize: 14 },
  meta: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 4, alignItems: 'center' },
  time: { color: 'rgba(244,246,251,0.6)', fontSize: 11 },
  status: { color: 'rgba(244,246,251,0.6)', fontSize: 11, marginLeft: 4 },
  statusRead: { color: '#7FD8A0' },
});
