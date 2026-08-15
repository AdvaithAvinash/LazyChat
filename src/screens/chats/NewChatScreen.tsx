import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Contacts from 'expo-contacts';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/types';
import { getOrCreateDirectChat } from '@/services/chatService';
import { findRegisteredUsersByPhone } from '@/services/userService';
import { colors } from '@/theme/colors';
import type { UserProfile } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function NewChatScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<UserProfile[]>([]);

  useEffect(() => {
    void loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadContacts() {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Contacts permission denied. Enable it in Settings to find friends.');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      const numbers = data.flatMap((contact) => contact.phoneNumbers?.map((p) => p.number) ?? []);
      const cleaned = numbers.filter((n): n is string => Boolean(n));
      const registered = await findRegisteredUsersByPhone(cleaned);
      setMatches(registered.filter((u) => u.uid !== profile?.uid));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(otherUser: UserProfile) {
    if (!profile) return;
    const chatId = await getOrCreateDirectChat(profile, otherUser);
    navigation.navigate('ChatRoom', { chatId });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>New chat</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={matches}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
            <Avatar name={item.displayName} photoURL={item.photoURL} />
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.phone}>{item.phoneNumber}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !error ? (
            <Text style={styles.empty}>None of your contacts are on LazyChat yet.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: '700', color: colors.text, paddingHorizontal: 16, marginBottom: 12 },
  error: { color: colors.danger, paddingHorizontal: 16, marginBottom: 12 },
  empty: { color: colors.textMuted, paddingHorizontal: 16, marginTop: 24, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  rowText: { marginLeft: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  phone: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
