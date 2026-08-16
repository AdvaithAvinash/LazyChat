'use client';

import Link from 'next/link';

import Avatar from '@/components/Avatar';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import type { Chat } from '@/types';
import { formatTimestamp } from '@/utils/format';

type Props = {
  chat: Chat;
  currentUserId: string;
  active: boolean;
};

export default function ChatListItem({ chat, currentUserId, active }: Props) {
  const otherUserId = chat.participants.find((id) => id !== currentUserId);
  const isGroup = chat.type === 'group';
  const title = isGroup
    ? chat.groupName ?? 'Group chat'
    : (otherUserId && chat.participantDetails[otherUserId]?.displayName) || 'Unknown';
  const photoURL = isGroup ? chat.groupPhoto : otherUserId ? chat.participantDetails[otherUserId]?.photoURL : null;
  const unread = chat.unreadCount?.[currentUserId] ?? 0;

  return (
    <Link
      href={`/chats/${chat.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-alt ${active ? 'bg-surface-alt' : ''}`}
    >
      <div className="relative shrink-0">
        <Avatar name={title} photoURL={photoURL} />
        {!isGroup && otherUserId ? <OnlineStatusDot uid={otherUserId} /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-text">{title}</span>
          <span className="shrink-0 text-xs text-text-muted">
            {formatTimestamp(chat.lastMessage?.createdAt ?? chat.updatedAt)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${unread > 0 ? 'font-medium text-text' : 'text-text-muted'}`}>
            {chat.lastMessage ? `${chat.lastMessage.senderId === currentUserId ? 'You: ' : ''}${chat.lastMessage.text}` : 'Say hi 👋'}
          </span>
          {unread > 0 ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-text">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
