# LazyChat

A real-time messaging web app (Next.js) with email/password login, 1:1 chat, media sharing,
push notifications, online presence, and WebRTC voice/video calls — built entirely on
Supabase, with no Firebase, Cloudinary, or mobile app store involved.

## Stack

| Feature | Technology |
|---|---|
| Login | Supabase Auth — email + password (no phone number, no OTP) |
| Real-time chat | Supabase Postgres + Realtime (`postgres_changes`) |
| Images / files | Supabase Storage |
| Push notifications | Web Push (browser-native) + a Supabase Edge Function |
| User profiles | Postgres `profiles` table |
| Online status | Supabase Realtime Presence |
| Voice / video calls | WebRTC (native browser APIs), signaled over Postgres tables |
| Backend logic | Supabase Edge Function (send push on new message / incoming call) |

### Why Supabase, and about "API keys"

Every backend needs *some* value to identify which project a client talks to — there's no
such thing as a real backend with literally zero configuration. What Supabase gives you
instead of a secret to protect: the project URL and the anon/publishable key are **meant
to be public** in client code (that's the whole design — see `.env.example`). Access
control comes from the Row Level Security policies in `supabase/migrations/`, not from
hiding that key. Supabase's free tier needs no credit card.

## Project layout

```
src/
  app/
    (auth)/sign-in, sign-up          Public auth pages
    profile-setup/                   Shown once, right after signup
    (app)/layout.tsx                 Sidebar shell + auth guard
    (app)/chats/, chats/[chatId]/    Chat list (persistent) + chat room
    (app)/new-chat/                  Search the user directory
    (app)/profile/, settings/        Account pages
  components/                        Avatar, MessageBubble, ChatListItem,
                                      CallOverlay, IncomingCallBanner, ...
  context/                           AuthContext, CallContext (global call state
                                      so a call survives route navigation)
  hooks/useWebRTCCall.ts             Browser WebRTC (native RTCPeerConnection)
  services/                          All backend I/O — plain functions, no
                                      framework coupling (auth, chat, messages,
                                      presence, storage, notifications, calls)
  config/supabase.ts                 Supabase browser client
  lib/supabase/middleware.ts         Session cookie refresh
  types/database.ts                  Hand-written mirror of the SQL schema
supabase/
  migrations/                        SQL: tables, RLS policies, storage bucket, RPCs
  functions/send-push/                Edge Function that sends the actual push notification
public/sw.js                          Service worker: shows/handles push notifications
```

## 1. Supabase project setup

1. Create a free project at https://supabase.com/dashboard.
2. **Authentication** → Email provider is enabled by default. Under Authentication →
   Settings, decide whether to require "Confirm email" (the app handles both cases).
3. **SQL Editor** → run the migrations in order (or use the Supabase CLI):
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push   # runs everything in supabase/migrations/
   ```
   This creates `profiles`, `chats`, `chat_members`, `messages`, `calls`,
   `call_candidates`, `push_subscriptions`, their RLS policies, two RPC functions,
   and the `chat-media` storage bucket.
4. **Project Settings → API** → copy the Project URL and the anon/publishable key into
   `.env.local` (see below).

## 2. Push notifications (Web Push + Edge Function)

Unlike a native app, a web app's push notifications need no app-store credential at
all — just a VAPID keypair, which is free and self-generated:

```bash
npx web-push generate-vapid-keys
```

Put the **public** key in `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`). The **private**
key never goes in any `.env` file — set it as a secret on the Edge Function only:

```bash
supabase functions deploy send-push
supabase secrets set VAPID_PUBLIC_KEY=<public key>
supabase secrets set VAPID_PRIVATE_KEY=<private key>
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service role key, from Project Settings -> API>
```

Then wire it up as a **Database Webhook** (Database → Webhooks in the dashboard):
- Trigger: `INSERT` on `public.messages` → HTTP request to the deployed function URL
- Trigger: `INSERT` on `public.calls` → same function URL

`public/sw.js` is the service worker that actually displays the notification and routes
a click back into the app — add real `icon-192.png` / `icon-512.png` files under
`public/` for a proper notification icon (the service worker references them, but the
app still works without them).

## 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

## 4. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000. That's it — no native build step, no simulator, no app
store review. WebRTC calls use browser-native `getUserMedia`/`RTCPeerConnection`, so
you'll need HTTPS (or `localhost`, which browsers exempt from that requirement) for
camera/microphone access to work outside of local dev.

### Deploying

Any Node host works; the natural default is Vercel (free tier, zero-config for Next.js):

```bash
npm install -g vercel
vercel
```

Set the same three `NEXT_PUBLIC_*` environment variables in the Vercel project
settings. Since it's a real deployment (not `localhost`), it gets HTTPS automatically —
required for both Web Push and `getUserMedia`.

## 5. Data model (Postgres)

- `profiles` — `id (= auth.users.id), email, display_name, avatar_url, about`
- `chats` — `type, created_by, group_name, group_photo, last_message (jsonb), updated_at`
- `chat_members` — join table `(chat_id, user_id, unread_count)`; membership drives all
  RLS access to a chat and its messages (see `is_chat_member()` in the migration)
- `messages` — `chat_id, sender_id, type, text, media_url, status, read_by[]`
- `calls` — `caller_id, callee_id, type, status, offer (jsonb), answer (jsonb)`
- `call_candidates` — ICE candidates, one row per candidate, tagged by `sender_id`
- `push_subscriptions` — one row per browser/device (`endpoint, p256dh, auth`)

Two Postgres functions (`increment_unread_counts`, `mark_messages_read`) exist because
those operations need atomic SQL expressions (`+1`, `array_append`) that a plain
client-side `.update()` can't express safely.

## 6. Realtime chat & presence

Chat list/messages use Supabase Realtime's `postgres_changes` — since Postgres doesn't
diff changed rows for you the way Firestore's listeners did, the client simply refetches
the relevant query on any change notification (cheap at this app's scale).

Online status uses Supabase **Realtime Presence**: every open tab joins one shared
channel keyed by its user id and calls `track()`; presence clears automatically if the
socket drops (tab closed, network lost), so there's no manual "last seen" bookkeeping.

## 7. Voice/video calls

Calling uses the browser's native WebRTC APIs directly (`RTCPeerConnection`,
`navigator.mediaDevices.getUserMedia`) — no extra library needed on the web. The
offer/answer/ICE candidates are written as rows in `calls` / `call_candidates` rather
than sent as ephemeral broadcast events, which avoids a race where a callee who
subscribes a moment late would simply miss the offer. Call state lives in
`CallContext` (mounted once, above the router) so an active call keeps running across
page navigation instead of being torn down. Two public STUN servers are configured by
default in `src/hooks/useWebRTCCall.ts`. **For reliable calls across real-world
networks (corporate firewalls, symmetric NATs), add a TURN server** (e.g. Twilio
Network Traversal Service, or a self-hosted coturn) to the `ICE_SERVERS` list before
shipping.

## 8. Finding people to chat with

Since there's no phone number or contact list in this app, starting a new chat works
by searching the user directory (`profiles`) by name or email (see the "New chat"
page), similar to Slack rather than WhatsApp's contacts-based model.
