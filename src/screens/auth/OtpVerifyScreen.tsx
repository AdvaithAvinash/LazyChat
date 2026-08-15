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

import { confirmOtp, sendOtp } from '@/services/authService';
import { colors } from '@/theme/colors';

type Props = {
  phoneNumber: string;
  confirmation: FirebaseAuthTypes.ConfirmationResult;
  onVerified: () => void;
  onBack: () => void;
};

export default function OtpVerifyScreen({ phoneNumber, confirmation, onVerified, onBack }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConfirmation, setActiveConfirmation] = useState(confirmation);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    setError(null);
    if (code.length < 6) {
      setError('Enter the 6-digit code sent to your phone');
      return;
    }

    setLoading(true);
    try {
      await confirmOtp(activeConfirmation, code);
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code, try again');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      const next = await sendOtp(phoneNumber);
      setActiveConfirmation(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>We sent a code to {phoneNumber}</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="123456"
        placeholderTextColor={colors.textMuted}
        maxLength={6}
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resend}>
        <Text style={styles.resendText}>{resending ? 'Sending…' : "Didn't get a code? Resend"}</Text>
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
  back: { position: 'absolute', top: 60, left: 24 },
  backText: { color: colors.primary, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: 32 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 8,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  error: { color: colors.danger, marginTop: 12 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  resend: { alignItems: 'center', marginTop: 20 },
  resendText: { color: colors.textMuted },
});
