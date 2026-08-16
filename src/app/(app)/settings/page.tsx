'use client';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/authService';
import { unregisterPushNotifications } from '@/services/notificationService';

export default function SettingsPage() {
  const { profile } = useAuth();

  const handleSignOut = async () => {
    await unregisterPushNotifications().catch(() => undefined);
    await signOut();
  };

  if (!profile) return null;

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-text">Settings</h1>

      <div className="mb-6 flex items-center gap-3.5 rounded-2xl bg-surface p-4">
        <Avatar name={profile.displayName} photoURL={profile.photoURL} size={56} />
        <div>
          <p className="text-lg font-semibold text-text">{profile.displayName}</p>
          <p className="mt-0.5 text-sm text-text-muted">{profile.email}</p>
        </div>
      </div>

      <button onClick={handleSignOut} className="w-full rounded-xl bg-surface px-4 py-4 text-left font-medium text-danger">
        Sign out
      </button>
    </div>
  );
}
