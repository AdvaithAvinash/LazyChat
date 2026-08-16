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

import { signUp } from '@/services/authService';
import { colors } from '@/theme/colors';

type Props = {
  onSwitchToSignIn: () => void;
};

export default function SignUpScreen({ onSwitchToSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmailMessage, setCheckEmailMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email.trim(), password);
      if (result.needsEmailConfirmation) {
        setCheckEmailMessage(
          `We sent a confirmation link to ${email.trim()}. Confirm it, then sign in below.`
        );
      }
      // Otherwise onAuthStateChange in AuthContext picks up the new session automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (checkEmailMessage) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>{checkEmailMessage}</Text>

        <TouchableOpacity style={styles.button} onPress={onSwitchToSignIn}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Just an email and password — that's it</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
      />

      <TextInput
        style={[styles.input, styles.inputSpacing]}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        placeholder="Password (min 6 characters)"
        placeholderTextColor={colors.textMuted}
      />

      <TextInput
        style={[styles.input, styles.inputSpacing]}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Confirm password"
        placeholderTextColor={colors.textMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Create account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={onSwitchToSignIn} style={styles.switch}>
        <Text style={styles.switchText}>Already have an account? Sign in</Text>
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
    fontSize: 30,
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
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputSpacing: { marginTop: 12 },
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
  switch: { alignItems: 'center', marginTop: 20 },
  switchText: { color: colors.primary, fontSize: 14 },
});
