import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/types';
import { createOrUpdateUserProfile, signOut } from '@/services/authService';
import { pickImageFromLibrary } from '@/services/mediaPickerService';
import { uploadToCloudinary } from '@/services/storageService';
import { unregisterPushNotifications } from '@/services/notificationService';
import { colors } from '@/theme/colors';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function ProfileScreen() {
  const { profile, firebaseUser, refreshProfile } = useAuth();
  const navigation = useNavigation<Nav>();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [about, setAbout] = useState(profile?.about ?? '');
  const [photoURL, setPhotoURL] = useState<string | null>(profile?.photoURL ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePickPhoto = async () => {
    const file = await pickImageFromLibrary();
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadToCloudinary(file);
      setPhotoURL(result.url);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await createOrUpdateUserProfile(firebaseUser.uid, firebaseUser.phoneNumber ?? '', {
        displayName: displayName.trim(),
        about: about.trim(),
        photoURL,
      });
      await refreshProfile();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (firebaseUser) await unregisterPushNotifications(firebaseUser.uid).catch(() => undefined);
    await signOut();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      <TouchableOpacity style={styles.avatar} onPress={handlePickPhoto} disabled={uploadingPhoto}>
        {uploadingPhoto ? <ActivityIndicator color={colors.text} /> : <Avatar name={displayName} photoURL={photoURL} size={96} />}
      </TouchableOpacity>

      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>About</Text>
      <TextInput style={styles.input} value={about} onChangeText={setAbout} placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Phone number</Text>
      <Text style={styles.readonly}>{profile?.phoneNumber}</Text>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Save changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    marginBottom: 24,
  },
  back: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '600' },
  avatar: { alignSelf: 'center', marginBottom: 28 },
  label: { color: colors.textMuted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readonly: { color: colors.textMuted, fontSize: 16, paddingVertical: 8 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  signOutButton: { alignItems: 'center', marginTop: 20 },
  signOutText: { color: colors.danger, fontSize: 15 },
});
