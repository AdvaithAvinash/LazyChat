// Supabase Edge Function: sends an Expo push notification whenever a new
// chat message or call is inserted. Wire it up as a Database Webhook
// (Database -> Webhooks in the Supabase dashboard) on INSERT for the
// `messages` and `calls` tables, pointed at this function's URL — see
// README.md for the exact steps. This is the piece that can't happen
// purely on the client: sending a push requires calling Expo's push API
// from a trusted server, not from the sender's own device.
//
// Deno / Supabase Edge Functions runtime — not part of the Expo app bundle.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'messages' | 'calls';
  record: Record<string, unknown>;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'high';
  channelId?: string;
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  // Service role key: required to read profiles/chat_members across users,
  // which RLS otherwise blocks. Only ever used server-side, never shipped
  // to the app.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function previewText(record: Record<string, unknown>): string {
  const type = record.type as string;
  if (type === 'text') return (record.text as string) ?? '';
  if (type === 'image') return '📷 Photo';
  if (type === 'video') return '🎬 Video';
  if (type === 'audio') return '🎤 Voice message';
  return `📎 ${(record.file_name as string) ?? 'File'}`;
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
}

async function handleNewMessage(record: Record<string, unknown>): Promise<void> {
  const chatId = record.chat_id as string;
  const senderId = record.sender_id as string;

  const [{ data: members }, { data: sender }] = await Promise.all([
    supabase.from('chat_members').select('user_id').eq('chat_id', chatId).neq('user_id', senderId),
    supabase.from('profiles').select('display_name').eq('id', senderId).single(),
  ]);
  if (!members || members.length === 0) return;

  const recipientIds = members.map((m) => m.user_id as string);
  const { data: recipients } = await supabase
    .from('profiles')
    .select('expo_push_tokens')
    .in('id', recipientIds);

  const tokens = (recipients ?? []).flatMap((r) => (r.expo_push_tokens as string[]) ?? []);
  const title = (sender?.display_name as string) || 'New message';
  const body = previewText(record);

  await sendExpoPush(
    tokens.map((to) => ({
      to,
      title,
      body,
      data: { type: 'message', chatId },
      sound: 'default',
      priority: 'high',
      channelId: 'messages',
    }))
  );
}

async function handleNewCall(record: Record<string, unknown>): Promise<void> {
  if (record.status !== 'ringing') return;

  const calleeId = record.callee_id as string;
  const { data: callee } = await supabase
    .from('profiles')
    .select('expo_push_tokens')
    .eq('id', calleeId)
    .single();

  const tokens = (callee?.expo_push_tokens as string[]) ?? [];
  const callerName = (record.caller_name as string) || 'Someone';
  const type = record.type as string;

  await sendExpoPush(
    tokens.map((to) => ({
      to,
      title: `Incoming ${type} call`,
      body: `${callerName} is calling you`,
      data: { type: 'call', callId: record.id as string, callType: type },
      sound: 'default',
      priority: 'high',
      channelId: 'messages',
    }))
  );
}

Deno.serve(async (req: Request) => {
  const payload = (await req.json()) as WebhookPayload;

  try {
    if (payload.table === 'messages' && payload.type === 'INSERT') {
      await handleNewMessage(payload.record);
    } else if (payload.table === 'calls' && payload.type === 'INSERT') {
      await handleNewCall(payload.record);
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), { status: 500 });
  }
});
