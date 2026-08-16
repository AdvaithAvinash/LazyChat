'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateDirectChat } from '@/services/chatService';
import { searchUsers } from '@/services/userService';
import type { UserProfile } from '@/types';

export default function NewChatPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile) return undefined;

    let cancelled = false;

    const timeout = setTimeout(() => {
      if (cancelled) return;

      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      searchUsers(query, profile.uid)
        .then((users) => {
          if (!cancelled) setResults(users);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, profile]);

  async function handleSelect(otherUser: UserProfile) {
    if (!profile) return;
    const chatId = await getOrCreateDirectChat(profile, otherUser);
    router.push(`/chats/${chatId}`);
  }

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col px-6 py-6">
      <h1 className="mb-4 text-2xl font-bold text-text">New chat</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email"
        autoFocus
        className="mb-3 w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
      />

      {loading ? <p className="mb-3 text-sm text-text-muted">Searching…</p> : null}
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      <div className="flex-1 overflow-y-auto">
        {results.map((user) => (
          <button
            key={user.uid}
            onClick={() => handleSelect(user)}
            className="flex w-full items-center gap-3 rounded-lg py-2.5 text-left hover:bg-surface-alt"
          >
            <Avatar name={user.displayName} photoURL={user.photoURL} />
            <div>
              <p className="font-semibold text-text">{user.displayName || user.email}</p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
          </button>
        ))}

        {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
          <p className="mt-6 text-center text-text-muted">No LazyChat users match &quot;{query.trim()}&quot;.</p>
        ) : null}
      </div>
    </div>
  );
}
