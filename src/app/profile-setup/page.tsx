'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { createOrUpdateUserProfile } from '@/services/authService';
import { uploadToStorage } from '@/services/storageService';

export default function ProfileSetupPage() {
  const { authUser, loading, profileComplete, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('Hey there! I am using LazyChat.');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!authUser) router.replace('/sign-in');
    else if (profileComplete) router.replace('/chats');
  }, [loading, authUser, profileComplete, router]);

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const result = await uploadToStorage(authUser.id, file);
      setPhotoURL(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.replace('/chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !authUser) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={handleSave} className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-text">Set up your profile</h1>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="mx-auto mb-7 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xs text-text-muted"
        >
          {uploadingPhoto ? '…' : photoURL ? <Avatar name={displayName} photoURL={photoURL} size={96} /> : 'Add photo'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />

        <label className="mb-1.5 mt-3 block text-sm text-text-muted">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
        />

        <label className="mb-1.5 mt-3 block text-sm text-text-muted">About</label>
        <input
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Say something about yourself"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text placeholder-text-muted outline-none focus:border-primary"
        />

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-7 w-full rounded-xl bg-primary py-3 font-semibold text-text transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
