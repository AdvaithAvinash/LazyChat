'use client';

import Link from 'next/link';
import { useState } from 'react';

import { signUp } from '@/services/authService';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmailMessage, setCheckEmailMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setCheckEmailMessage(`We sent a confirmation link to ${email.trim()}. Confirm it, then sign in below.`);
      }
      // Otherwise AuthContext picks up the new session and the (auth) layout redirects.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (checkEmailMessage) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-bold text-text">Check your email</h1>
        <p className="mb-8 text-text-muted">{checkEmailMessage}</p>
        <Link
          href="/sign-in"
          className="block w-full rounded-xl bg-primary py-3 text-center font-semibold text-text transition hover:opacity-90"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <h1 className="mb-2 text-3xl font-bold text-text">Create your account</h1>
      <p className="mb-8 text-text-muted">Just an email and password — that&apos;s it</p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 6 characters)"
        autoComplete="new-password"
        className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
      />

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        autoComplete="new-password"
        className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
      />

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-text transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p className="mt-5 text-center text-sm">
        <Link href="/sign-in" className="text-primary hover:underline">
          Already have an account? Sign in
        </Link>
      </p>
    </form>
  );
}
