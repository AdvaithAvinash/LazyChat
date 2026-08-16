'use client';

import type { Message } from '@/types';
import { formatTimestamp } from '@/utils/format';

type Props = {
  message: Message;
  isOwn: boolean;
};

const statusIcon: Record<Message['status'], string> = {
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓',
};

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex px-3 py-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
          isOwn ? 'rounded-br-md bg-bubble-outgoing' : 'rounded-bl-md bg-bubble-incoming'
        }`}
      >
        <MessageContent message={message} />
        <div className="mt-1 flex items-center justify-end gap-1">
          <span className="text-[11px] text-white/60">{formatTimestamp(message.createdAt)}</span>
          {isOwn ? (
            <span className={`text-[11px] ${message.status === 'read' ? 'text-[#7FD8A0]' : 'text-white/60'}`}>
              {statusIcon[message.status]}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MessageContent({ message }: { message: Message }) {
  if (message.type === 'image' && message.mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded chat media, not a known static asset
    return <img src={message.mediaUrl} alt="" className="mb-1 max-h-72 w-full max-w-xs rounded-lg object-cover" />;
  }

  if (message.type === 'video' && message.mediaUrl) {
    return (
      <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 py-1 text-sm text-text">
        🎬 {message.fileName ?? 'Video'}
      </a>
    );
  }

  if ((message.type === 'file' || message.type === 'audio') && message.mediaUrl) {
    return (
      <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 py-1 text-sm text-text">
        {message.type === 'audio' ? '🎤' : '📎'} {message.fileName ?? 'Attachment'}
      </a>
    );
  }

  return <p className="whitespace-pre-wrap break-words text-[15px] text-text">{message.text}</p>;
}
