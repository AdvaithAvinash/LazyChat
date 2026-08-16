import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/config/supabase';
import type { Presence } from '@/types';

const CHANNEL_NAME = 'presence:lazychat';

/**
 * One shared Realtime Presence channel for the whole app: every signed-in
 * user joins it keyed by their uid and calls track() to announce themselves
 * online, and any screen can read who else is currently joined. This is the
 * Supabase-native replacement for the Realtime-Database onDisconnect()
 * pattern — presence is tracked server-side per socket, so a killed app or
 * lost connection clears the user's key automatically.
 */
let channel: RealtimeChannel | null = null;
let channelReady: Promise<RealtimeChannel> | null = null;
const syncListeners = new Set<() => void>();

function ensureChannel(presenceKey: string): Promise<RealtimeChannel> {
  if (channelReady) return channelReady;

  const ch = supabase.channel(CHANNEL_NAME, { config: { presence: { key: presenceKey } } });
  ch.on('presence', { event: 'sync' }, () => syncListeners.forEach((listener) => listener()));
  channel = ch;

  channelReady = new Promise((resolve) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve(ch);
    });
  });

  return channelReady;
}

export function startPresenceTracking(uid: string): () => void {
  let cancelled = false;

  ensureChannel(uid).then((ch) => {
    if (!cancelled) void ch.track({ online_at: new Date().toISOString() });
  });

  return () => {
    cancelled = true;
    if (channel) {
      void channel.untrack();
      supabase.removeChannel(channel);
    }
    channel = null;
    channelReady = null;
  };
}

export function subscribeToPresence(uid: string, callback: (presence: Presence) => void): () => void {
  const emit = () => {
    const state = channel?.presenceState() ?? {};
    const online = Boolean(state[uid]?.length);
    callback({ state: online ? 'online' : 'offline', lastChanged: Date.now() });
  };

  syncListeners.add(emit);
  ensureChannel(uid).then(emit);

  return () => {
    syncListeners.delete(emit);
  };
}
