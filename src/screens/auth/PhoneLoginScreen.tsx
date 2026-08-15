import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { sendOtp } from '@/services/authService';
import { colors } from '@/theme/colors';

type Props = {
  onCodeSent: (phoneNumber: string, confirmation: FirebaseAuthTypes.ConfirmationResult) => void;
};

export default function PhoneLoginScreen({ onCodeSent }: Props) {
  const [phoneNumber, setPhoneNumber] = useState('+1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      setError('Enter a valid phone number in international format, e.g. +14155552671');
      return;
    }

    setLoading(true);
    try {
      const confirmation = await sendOtp(phoneNumber);
      onCodeSent(phoneNumber, confirmation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>LazyChat</Text>
      <Text style={styles.subtitle}>Enter your phone number to get started</Text>

      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholder="+14155552671"
        placeholderTextColor={colors.textMuted}
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Send code</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    color: colors.danger,
    marginTop: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
