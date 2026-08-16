import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { createOrUpdateUserProfile } from '@/services/authService';
import { pickImageFromLibrary } from '@/services/mediaPickerService';
import { uploadToStorage } from '@/services/storageService';
import { colors } from '@/theme/colors';

export default function ProfileSetupScreen() {
  const { authUser, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('Hey there! I am using LazyChat.');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    if (!authUser) return;
    try {
      const file = await pickImageFromLibrary();
      if (!file) return;
      setUploadingPhoto(true);
      const result = await uploadToStorage(authUser.id, file);
      setPhotoURL(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!authUser) return;
    if (displayName.trim().length < 2) {
      setError('Enter a display name (at least 2 characters)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createOrUpdateUserProfile(authUser.id, authUser.email ?? '', {
        displayName: displayName.trim(),
        about: about.trim(),
        photoURL,
      });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Set up your profile</Text>

      <TouchableOpacity style={styles.avatar} onPress={handlePickPhoto} disabled={uploadingPhoto}>
        {uploadingPhoto ? (
          <ActivityIndicator color={colors.text} />
        ) : photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarPlaceholder}>Add photo</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Display name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>About</Text>
      <TextInput
        style={styles.input}
        value={about}
        onChangeText={setAbout}
        placeholder="Say something about yourself"
        placeholderTextColor={colors.textMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 24, textAlign: 'center' },
  avatar: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96 },
  avatarPlaceholder: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
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
  error: { color: colors.danger, marginTop: 12 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
