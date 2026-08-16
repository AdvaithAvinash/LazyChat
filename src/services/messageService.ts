import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '@/config/supabase';
import type { Message, MessageType } from '@/types';
import type { Database } from '@/types/database';

type MessageRow = Database['public']['Tables']['messages']['Row'];

function messageFromRow(row: MessageRow): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    type: row.type,
    text: row.text,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    fileName: row.file_name,
    createdAt: row.created_at,
    status: row.status,
    readBy: row.read_by,
  };
}

export type SendMessageInput = {
  chatId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
};

function previewText(input: SendMessageInput): string {
  if (input.type === 'text') return input.text ?? '';
  if (input.type === 'image') return '📷 Photo';
  if (input.type === 'video') return '🎬 Video';
  if (input.type === 'audio') return '🎤 Voice message';
  return `📎 ${input.fileName ?? 'File'}`;
}

export async function sendMessage(input: SendMessageInput): Promise<void> {
  const { error: insertError } = await supabase.from('messages').insert({
    chat_id: input.chatId,
    sender_id: input.senderId,
    type: input.type,
    text: input.text ?? null,
    media_url: input.mediaUrl ?? null,
    media_type: input.mediaType ?? null,
    file_name: input.fileName ?? null,
  });
  if (insertError) throw insertError;

  const { error: chatError } = await supabase
    .from('chats')
    .update({
      last_message: {
        text: previewText(input),
        senderId: input.senderId,
        createdAt: new Date().toISOString(),
        type: input.type,
      },
    })
    .eq('id', input.chatId);
  if (chatError) throw chatError;

  const { error: unreadError } = await supabase.rpc('increment_unread_counts', {
    p_chat_id: input.chatId,
    p_sender_id: input.senderId,
  });
  if (unreadError) throw unreadError;
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  pageSize = 50
) {
  let messages: Message[] = [];
  let cancelled = false;

  const setAndEmit = (next: Message[]) => {
    messages = next;
    if (!cancelled) callback(messages);
  };

  supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(pageSize)
    .then(({ data, error }) => {
      if (error || cancelled) return;
      setAndEmit((data ?? []).map(messageFromRow).reverse());
    });

  const handleChange = (payload: RealtimePostgresChangesPayload<MessageRow>) => {
    if (payload.eventType === 'INSERT') {
      const incoming = messageFromRow(payload.new);
      if (messages.some((m) => m.id === incoming.id)) return;
      setAndEmit([...messages, incoming]);
    } else if (payload.eventType === 'UPDATE') {
      const updated = messageFromRow(payload.new);
      setAndEmit(messages.map((m) => (m.id === updated.id ? updated : m)));
    }
  };

  const channel = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      handleChange
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function markMessagesRead(chatId: string, messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const { error } = await supabase.rpc('mark_messages_read', {
    p_message_ids: messageIds,
    p_chat_id: chatId,
  });
  if (error) throw error;
}
