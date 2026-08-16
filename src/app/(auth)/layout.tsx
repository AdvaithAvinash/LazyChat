'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { authUser, loading, profileComplete } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authUser) {
      router.replace(profileComplete ? '/chats' : '/profile-setup');
    }
  }, [loading, authUser, profileComplete, router]);

  return <div className="flex min-h-screen items-center justify-center bg-background px-6">{children}</div>;
}
