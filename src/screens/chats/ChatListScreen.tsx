import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import ChatListItem from '@/components/ChatListItem';
import Avatar from '@/components/Avatar';
import { subscribeToUserChats } from '@/services/chatService';
import type { Chat } from '@/types';
import { colors } from '@/theme/colors';
import type { MainStackParamList } from '@/navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function ChatListScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<Nav>();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!profile) return undefined;
    return subscribeToUserChats(profile.uid, setChats, () => undefined);
  }, [profile]);

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Avatar name={profile.displayName} photoURL={profile.photoURL} size={36} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatListItem
            chat={item}
            currentUserId={profile.uid}
            onPress={() => navigation.navigate('ChatRoom', { chatId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chats yet. Start one from the + button.</Text>
          </View>
        }
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewChat')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: colors.text, fontSize: 28, lineHeight: 30 },
});
