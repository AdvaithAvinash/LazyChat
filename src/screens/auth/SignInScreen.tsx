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

import { signIn } from '@/services/authService';
import { colors } from '@/theme/colors';

type Props = {
  onSwitchToSignUp: () => void;
};

export default function SignInScreen({ onSwitchToSignUp }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length === 0) {
      setError('Enter your password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // onAuthStateChange in AuthContext picks up the new session from here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>LazyChat</Text>
      <Text style={styles.subtitle}>Sign in with your email and password</Text>

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
        autoComplete="password"
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Sign in</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={onSwitchToSignUp} style={styles.switch}>
        <Text style={styles.switchText}>New here? Create an account</Text>
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
