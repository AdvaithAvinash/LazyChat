'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ChatListItem from '@/components/ChatListItem';
import { useAuth } from '@/context/AuthContext';
import { subscribeToUserChats } from '@/services/chatService';
import type { Chat } from '@/types';

export default function ChatListPanel() {
  const { profile } = useAuth();
  const params = useParams<{ chatId?: string }>();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!profile) return undefined;
    return subscribeToUserChats(profile.uid, setChats, () => undefined);
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-background sm:w-[340px]">
      <div className="flex items-center justify-between px-4 py-5">
        <h1 className="text-2xl font-bold text-text">Chats</h1>
        <Link
          href="/new-chat"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg leading-none text-text transition hover:opacity-90"
          title="New chat"
        >
          +
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-text-muted">No chats yet. Start one from the + button.</p>
        ) : (
          chats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} currentUserId={profile.uid} active={params?.chatId === chat.id} />
          ))
        )}
      </div>
    </div>
  );
}
