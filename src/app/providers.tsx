'use client';

import { AuthProvider } from '@/context/AuthContext';
import { CallProvider } from '@/context/CallContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CallProvider>{children}</CallProvider>
    </AuthProvider>
  );
}
