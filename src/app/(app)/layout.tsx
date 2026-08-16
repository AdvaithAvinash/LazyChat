'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import ChatListPanel from '@/components/ChatListPanel';
import NavRail from '@/components/NavRail';
import { useAuth } from '@/context/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, loading, profileComplete } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!authUser) router.replace('/sign-in');
    else if (!profileComplete) router.replace('/profile-setup');
  }, [loading, authUser, profileComplete, router]);

  if (loading || !authUser || !profileComplete) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <NavRail />
      <ChatListPanel />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
