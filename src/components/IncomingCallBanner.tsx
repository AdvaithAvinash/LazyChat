'use client';

import Avatar from '@/components/Avatar';
import type { Call } from '@/types';

type Props = {
  call: Call;
  onAccept: () => void;
  onDecline: () => void;
};

export default function IncomingCallBanner({ call, onAccept, onDecline }: Props) {
  return (
    <div className="fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xl">
      <Avatar name={call.callerName} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text">{call.callerName}</p>
        <p className="text-xs text-text-muted">Incoming {call.type} call…</p>
      </div>
      <button
        onClick={onDecline}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-danger text-lg"
        title="Decline"
      >
        📵
      </button>
      <button
        onClick={onAccept}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-lg"
        title="Accept"
      >
        {call.type === 'video' ? '🎥' : '📞'}
      </button>
    </div>
  );
}
