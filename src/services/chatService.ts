import { supabase } from '@/config/supabase';
import { fetchProfilesByIds } from '@/services/userService';
import type { Chat, MessageType, UserProfile } from '@/types';
import type { Database } from '@/types/database';

type ChatRow = Database['public']['Tables']['chats']['Row'];
type ChatMemberRow = Database['public']['Tables']['chat_members']['Row'];

async function assembleChats(rows: ChatRow[], members: ChatMemberRow[]): Promise<Chat[]> {
  const membersByChat = new Map<string, ChatMemberRow[]>();
  for (const member of members) {
    const list = membersByChat.get(member.chat_id) ?? [];
    list.push(member);
    membersByChat.set(member.chat_id, list);
  }

  const profiles = await fetchProfilesByIds(members.map((m) => m.user_id));

  const chats = rows.map((row): Chat => {
    const chatMembers = membersByChat.get(row.id) ?? [];
    const participantDetails: Chat['participantDetails'] = {};
    const unreadCount: Record<string, number> = {};

    for (const member of chatMembers) {
      const profile = profiles.get(member.user_id);
      participantDetails[member.user_id] = {
        displayName: profile?.displayName ?? 'Unknown',
        photoURL: profile?.photoURL ?? null,
      };
      unreadCount[member.user_id] = member.unread_count;
    }

    return {
      id: row.id,
      type: row.type,
      participants: chatMembers.map((m) => m.user_id),
      participantDetails,
      groupName: row.group_name,
      groupPhoto: row.group_photo,
      lastMessage: row.last_message
        ? {
            text: row.last_message.text,
            senderId: row.last_message.senderId,
            createdAt: row.last_message.createdAt,
            type: row.last_message.type as MessageType,
          }
        : null,
      unreadCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/** Finds an existing 1:1 chat between two users, or creates a new one. */
export async function getOrCreateDirectChat(currentUser: UserProfile, otherUser: UserProfile): Promise<string> {
  const [{ data: mine, error: mineError }, { data: theirs, error: theirsError }] = await Promise.all([
    supabase.from('chat_members').select('chat_id').eq('user_id', currentUser.uid),
    supabase.from('chat_members').select('chat_id').eq('user_id', otherUser.uid),
  ]);
  if (mineError) throw mineError;
  if (theirsError) throw theirsError;

  const theirChatIds = new Set((theirs ?? []).map((row) => row.chat_id));
  const commonChatIds = (mine ?? []).map((row) => row.chat_id).filter((id) => theirChatIds.has(id));

  if (commonChatIds.length > 0) {
    const { data: existing, error } = await supabase
      .from('chats')
      .select('id')
      .in('id', commonChatIds)
      .eq('type', 'direct')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (existing) return existing.id;
  }

  const { data: newChat, error: chatError } = await supabase
    .from('chats')
    .insert({ type: 'direct', created_by: currentUser.uid })
    .select('id')
    .single();
  if (chatError) throw chatError;

  const { error: memberError } = await supabase.from('chat_members').insert([
    { chat_id: newChat.id, user_id: currentUser.uid },
    { chat_id: newChat.id, user_id: otherUser.uid },
  ]);
  if (memberError) throw memberError;

  return newChat.id;
}

async function fetchUserChats(uid: string): Promise<Chat[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', uid);
  if (membershipsError) throw membershipsError;

  const chatIds = (memberships ?? []).map((m) => m.chat_id);
  if (chatIds.length === 0) return [];

  const [{ data: chatRows, error: chatsError }, { data: memberRows, error: membersError }] = await Promise.all([
    supabase.from('chats').select('*').in('id', chatIds),
    supabase.from('chat_members').select('*').in('chat_id', chatIds),
  ]);
  if (chatsError) throw chatsError;
  if (membersError) throw membersError;

  return assembleChats(chatRows ?? [], memberRows ?? []);
}

/**
 * Postgres realtime doesn't diff rows the way Firestore's onSnapshot did, so
 * rather than hand-patch local state on every event we just refetch the
 * whole chat list on any relevant change. Fine at this app's scale, and far
 * less error-prone than incremental merging.
 */
export function subscribeToUserChats(
  uid: string,
  callback: (chats: Chat[]) => void,
  onError?: (error: Error) => void
) {
  let cancelled = false;

  const refresh = () => {
    fetchUserChats(uid)
      .then((chats) => {
        if (!cancelled) callback(chats);
      })
      .catch((error: unknown) => onError?.(error instanceof Error ? error : new Error(String(error))));
  };

  refresh();

  const channel = supabase
    .channel(`user-chats:${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_members', filter: `user_id=eq.${uid}` },
      refresh
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, refresh)
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export function subscribeToChat(chatId: string, callback: (chat: Chat | null) => void) {
  let cancelled = false;

  const refresh = async () => {
    const [{ data: chatRow, error: chatError }, { data: memberRows, error: membersError }] = await Promise.all([
      supabase.from('chats').select('*').eq('id', chatId).maybeSingle(),
      supabase.from('chat_members').select('*').eq('chat_id', chatId),
    ]);
    if (cancelled) return;
    if (chatError || !chatRow || membersError) {
      callback(null);
      return;
    }

    const [chat] = await assembleChats([chatRow], memberRows ?? []);
    if (!cancelled) callback(chat ?? null);
  };

  refresh();

  const channel = supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` }, refresh)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chatId}` },
      refresh
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function markChatRead(chatId: string, uid: string): Promise<void> {
  const { error } = await supabase
    .from('chat_members')
    .update({ unread_count: 0 })
    .eq('chat_id', chatId)
    .eq('user_id', uid);
  if (error) throw error;
}
