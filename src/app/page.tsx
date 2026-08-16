'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const { authUser, loading, profileComplete } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!authUser) router.replace('/sign-in');
    else router.replace(profileComplete ? '/chats' : '/profile-setup');
  }, [loading, authUser, profileComplete, router]);

  return null;
}
