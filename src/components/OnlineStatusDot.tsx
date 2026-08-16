'use client';

import { useEffect, useState } from 'react';

import { subscribeToPresence } from '@/services/presenceService';

type Props = {
  uid: string;
  size?: number;
  className?: string;
};

export default function OnlineStatusDot({ uid, size = 12, className = '' }: Props) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    return subscribeToPresence(uid, (presence) => setOnline(presence.state === 'online'));
  }, [uid]);

  if (!online) return null;

  return (
    <span
      style={{ width: size, height: size }}
      className={`absolute bottom-0 right-0 rounded-full border-2 border-background bg-success ${className}`}
    />
  );
}
