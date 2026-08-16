'use client';

import Link from 'next/link';
import { useState } from 'react';

import { signIn } from '@/services/authService';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // AuthContext picks up the new session and the (auth) layout redirects.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <h1 className="mb-2 text-4xl font-bold text-text">LazyChat</h1>
      <p className="mb-8 text-text-muted">Sign in with your email and password</p>

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
        placeholder="Password"
        autoComplete="current-password"
        className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
      />

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-text transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="mt-5 text-center text-sm">
        <Link href="/sign-up" className="text-primary hover:underline">
          New here? Create an account
        </Link>
      </p>
    </form>
  );
}
