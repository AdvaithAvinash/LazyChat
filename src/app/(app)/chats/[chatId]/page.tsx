'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import Avatar from '@/components/Avatar';
import MessageBubble from '@/components/MessageBubble';
import OnlineStatusDot from '@/components/OnlineStatusDot';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { subscribeToChat } from '@/services/chatService';
import { markMessagesRead, sendMessage, subscribeToMessages } from '@/services/messageService';
import { uploadToStorage } from '@/services/storageService';
import type { Chat, Message } from '@/types';

export default function ChatRoomPage() {
  const { profile } = useAuth();
  const { startCall } = useCall();
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeToChat(chatId, setChat), [chatId]);
  useEffect(() => subscribeToMessages(chatId, setMessages), [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const otherUserId = useMemo(() => chat?.participants.find((id) => id !== profile?.uid), [chat, profile]);
  const otherUser = otherUserId ? chat?.participantDetails[otherUserId] : undefined;

  useEffect(() => {
    if (!profile || messages.length === 0) return;
    const unread = messages.filter((m) => m.senderId !== profile.uid && !m.readBy.includes(profile.uid));
    if (unread.length > 0) {
      markMessagesRead(chatId, unread.map((m) => m.id)).catch(() => undefined);
    }
  }, [messages, profile, chatId]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || text.trim().length === 0) return;
    const value = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage({ chatId, senderId: profile.uid, type: 'text', text: value });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'image' | 'file'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;

    const type = kind === 'image' ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
    setUploading(true);
    try {
      const result = await uploadToStorage(profile.uid, file);
      await sendMessage({
        chatId,
        senderId: profile.uid,
        type,
        mediaUrl: result.url,
        mediaType: result.mimeType,
        fileName: file.name,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!otherUserId || !otherUser) return;
    startCall(otherUserId, otherUser.displayName, type);
  };

  if (!profile || !chat) {
    return <div className="flex h-full items-center justify-center text-text-muted">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="relative shrink-0">
          <Avatar name={otherUser?.displayName ?? 'Unknown'} photoURL={otherUser?.photoURL} size={40} />
          {otherUserId ? <OnlineStatusDot uid={otherUserId} /> : null}
        </div>

        <h2 className="flex-1 truncate text-base font-semibold text-text">
          {chat.type === 'group' ? chat.groupName : otherUser?.displayName ?? 'Chat'}
        </h2>

        <button onClick={() => handleStartCall('voice')} className="rounded-lg p-2 text-lg hover:bg-surface-alt" title="Voice call">
          📞
        </button>
        <button onClick={() => handleStartCall('video')} className="rounded-lg p-2 text-lg hover:bg-surface-alt" title="Video call">
          🎥
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} isOwn={message.senderId === profile.uid} />
        ))}
        <div ref={bottomRef} />
      </div>

      {uploading ? <p className="py-1.5 text-center text-xs text-text-muted">Uploading…</p> : null}

      <form onSubmit={handleSendText} className="flex items-end gap-1 border-t border-border px-2.5 py-2.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg p-2 text-lg hover:bg-surface-alt"
          title="Attach file"
        >
          📎
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelected(e, 'file')} />

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="rounded-lg p-2 text-lg hover:bg-surface-alt"
          title="Attach image"
        >
          🖼️
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e, 'image')}
        />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          className="mx-1 flex-1 rounded-full bg-surface px-4 py-2.5 text-text placeholder-text-muted outline-none"
        />

        <button
          type="submit"
          disabled={sending || text.trim().length === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-text transition disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
