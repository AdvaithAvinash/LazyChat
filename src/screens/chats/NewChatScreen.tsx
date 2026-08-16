import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/types';
import { getOrCreateDirectChat } from '@/services/chatService';
import { searchUsers } from '@/services/userService';
import { colors } from '@/theme/colors';
import type { UserProfile } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function NewChatScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile) return undefined;
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      searchUsers(query, profile.uid)
        .then((users) => {
          if (!cancelled) setResults(users);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, profile]);

  async function handleSelect(otherUser: UserProfile) {
    if (!profile) return;
    const chatId = await getOrCreateDirectChat(profile, otherUser);
    navigation.navigate('ChatRoom', { chatId });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>New chat</Text>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoFocus
      />

      {loading ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
            <Avatar name={item.displayName} photoURL={item.photoURL} />
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.displayName || item.email}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && !error && query.trim().length >= 2 ? (
            <Text style={styles.empty}>No LazyChat users match "{query.trim()}".</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  spinner: { marginVertical: 12 },
  error: { color: colors.danger, marginBottom: 12 },
  empty: { color: colors.textMuted, marginTop: 24, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowText: { marginLeft: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
