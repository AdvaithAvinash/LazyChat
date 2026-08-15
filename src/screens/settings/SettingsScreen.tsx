import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/authService';
import { unregisterPushNotifications } from '@/services/notificationService';
import { colors } from '@/theme/colors';

export default function SettingsScreen() {
  const { profile, firebaseUser } = useAuth();

  const handleSignOut = async () => {
    if (firebaseUser) await unregisterPushNotifications(firebaseUser.uid).catch(() => undefined);
    await signOut();
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.profileRow}>
        <Avatar name={profile.displayName} photoURL={profile.photoURL} size={56} />
        <View style={styles.profileText}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.phone}>{profile.phoneNumber}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.row} onPress={handleSignOut}>
        <Text style={styles.rowTextDanger}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingHorizontal: 16 },
  header: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 24 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  profileText: { marginLeft: 14 },
  name: { color: colors.text, fontSize: 18, fontWeight: '600' },
  phone: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowTextDanger: { color: colors.danger, fontSize: 16, fontWeight: '500' },
});
