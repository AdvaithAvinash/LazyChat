// Supabase Edge Function: sends a Web Push notification whenever a new chat
// message or call is inserted. Wire it up as a Database Webhook (Database ->
// Webhooks in the Supabase dashboard) on INSERT for the `messages` and
// `calls` tables, pointed at this function's URL — see README.md. This is
// the piece that can't happen purely on the client: Web Push requires
// signing the request with the VAPID private key from a trusted server, not
// from the sender's own browser.
//
// Deno / Supabase Edge Functions runtime — not part of the Next.js app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  // Service role key: required to read profiles/subscriptions across users,
  // which RLS otherwise blocks. Only ever used server-side, never shipped
  // to the app.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
);

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'messages' | 'calls';
  record: Record<string, unknown>;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function previewText(record: Record<string, unknown>): string {
  const type = record.type as string;
  if (type === 'text') return (record.text as string) ?? '';
  if (type === 'image') return '📷 Photo';
  if (type === 'video') return '🎬 Video';
  if (type === 'audio') return '🎤 Voice message';
  return `📎 ${(record.file_name as string) ?? 'File'}`;
}

async function sendWebPush(
  subscriptions: PushSubscriptionRow[],
  payload: { title: string; body: string; data: Record<string, unknown> }
): Promise<void> {
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (error) {
        // A 404/410 means the subscription is stale (browser data cleared,
        // permission revoked, etc.) — clean it up so future sends don't retry it.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    })
  );
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
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', recipientIds);
  if (!subscriptions || subscriptions.length === 0) return;

  await sendWebPush(subscriptions, {
    title: (sender?.display_name as string) || 'New message',
    body: previewText(record),
    data: { type: 'message', chatId },
  });
}

async function handleNewCall(record: Record<string, unknown>): Promise<void> {
  if (record.status !== 'ringing') return;

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', record.callee_id as string);
  if (!subscriptions || subscriptions.length === 0) return;

  const callerName = (record.caller_name as string) || 'Someone';
  const type = record.type as string;

  await sendWebPush(subscriptions, {
    title: `Incoming ${type} call`,
    body: `${callerName} is calling you`,
    data: { type: 'call', callId: record.id as string, callType: type },
  });
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
