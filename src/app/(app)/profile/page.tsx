'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { createOrUpdateUserProfile } from '@/services/authService';
import { uploadToStorage } from '@/services/storageService';

export default function ProfilePage() {
  const { profile, authUser, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [about, setAbout] = useState(profile?.about ?? '');
  const [photoURL, setPhotoURL] = useState<string | null>(profile?.photoURL ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadToStorage(authUser.id, file);
      setPhotoURL(result.url);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    setSaving(true);
    setError(null);
    try {
      await createOrUpdateUserProfile(authUser.id, authUser.email ?? '', {
        displayName: displayName.trim(),
        about: about.trim(),
        photoURL,
      });
      await refreshProfile();
      router.push('/chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto px-6 py-8">
      <h1 className="mb-8 text-xl font-semibold text-text">Profile</h1>

      <form onSubmit={handleSave}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="mx-auto mb-7 block"
        >
          {uploadingPhoto ? (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface text-text-muted">…</div>
          ) : (
            <Avatar name={displayName} photoURL={photoURL} size={96} />
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />

        <label className="mb-1.5 mt-3 block text-sm text-text-muted">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-primary"
        />

        <label className="mb-1.5 mt-3 block text-sm text-text-muted">About</label>
        <input
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-primary"
        />

        <label className="mb-1.5 mt-3 block text-sm text-text-muted">Email</label>
        <p className="py-2 text-text-muted">{profile.email}</p>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-7 w-full rounded-xl bg-primary py-3 font-semibold text-text transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
