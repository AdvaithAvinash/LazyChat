# LazyChat

A cross-platform messaging app (React Native + Expo) with email/password login, real-time
1:1 chat, media sharing, push notifications, online presence, and WebRTC voice/video calls —
built entirely on Supabase, with no Firebase or Cloudinary involved.

## Stack

| Feature | Technology |
|---|---|
| Login | Supabase Auth — email + password (no phone number, no OTP) |
| Real-time chat | Supabase Postgres + Realtime (`postgres_changes`) |
| Images / files | Supabase Storage |
| Push notifications | Expo push notifications + a Supabase Edge Function |
| User profiles | Postgres `profiles` table |
| Online status | Supabase Realtime Presence |
| Voice / video calls | WebRTC (`react-native-webrtc`), signaled over Postgres tables |
| Backend logic | Supabase Edge Function (send push on new message / incoming call) |

### Why Supabase, and about "API keys"

Every backend needs *some* value to identify which project a client talks to — there's
no such thing as a real backend with literally zero configuration. What Supabase gives
you instead of a secret to protect: the project URL and the "anon" key are **meant to be
public** in client code (that's the whole design — see `.env.example`). Access control
comes from the Row Level Security policies in `supabase/migrations/`, not from hiding
that key. Supabase's free tier needs no credit card.

## Project layout

```
App.tsx                        App entry: providers + navigation
src/
  config/
    supabase.ts                 Supabase client (AsyncStorage-persisted session)
    env.ts                      Reads SUPABASE_URL / SUPABASE_ANON_KEY
  context/AuthContext.tsx       Auth state, profile, presence, push registration
  services/                     All backend I/O (auth, chat, messages, presence,
                                 storage, notifications, calls)
  hooks/useWebRTCCall.ts        WebRTC peer connection + Postgres-table signaling
  navigation/                   Root/Auth/Tab navigators, route param types
  screens/                      auth/, chats/, calls/, profile/, settings/
  components/                   Avatar, MessageBubble, ChatListItem, ...
  types/database.ts             Hand-written mirror of the SQL schema (for supabase-js)
supabase/
  migrations/                   SQL: tables, RLS policies, storage bucket, RPCs
  functions/send-push/          Edge Function that sends the actual push notification
```

## 1. Supabase project setup

1. Create a free project at https://supabase.com/dashboard.
2. **Authentication** → Providers → **Email** is enabled by default. Under
   Authentication → Settings, decide whether to require "Confirm email" (the app
   handles both cases — see `SignUpScreen`).
3. **SQL Editor** → run the migrations in order (or use the Supabase CLI):
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push   # runs everything in supabase/migrations/
   ```
   This creates `profiles`, `chats`, `chat_members`, `messages`, `calls`,
   `call_candidates`, their RLS policies, two RPC functions, and the `chat-media`
   storage bucket.
4. **Project Settings → API** → copy the Project URL and the `anon` `public` key into
   `.env` (see below).

## 2. Push notifications (Edge Function)

Push notifications need a small server-side piece — sending a push requires calling
Expo's push API from a trusted server, which can't happen from the sender's own device.

```bash
supabase functions deploy send-push
```

Then wire it up as a **Database Webhook** (Database → Webhooks in the dashboard):
- Trigger: `INSERT` on `public.messages` → HTTP request to the deployed function URL
- Trigger: `INSERT` on `public.calls` → same function URL

The function needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` available as Edge
Function secrets (the CLI sets `SUPABASE_URL` automatically; add the service role key
with `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` — find it in Project Settings
→ API. This key bypasses Row Level Security, so it only ever lives server-side, never
in the app).

### The one Android caveat that no backend choice avoids

Android push delivery fundamentally goes through Firebase Cloud Messaging at the OS
level — that's how Google Play Services works, regardless of which backend (Supabase,
Firebase, anything) sends the notification. Expo's push service handles this for you,
but for a production (non-Expo-Go) build you still need to upload an FCM server key to
EAS once: `eas credentials` → Android → Push Notifications. No Firebase code is written
in this app either way — this is a one-time credential upload, not an integration.

## 3. Environment variables

```bash
cp .env.example .env
```

Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Project Settings → API, and
`EAS_PROJECT_ID` after running `eas init`.

## 4. Install & run

This app uses a native module (`react-native-webrtc`) that isn't available in Expo
Go — you need a custom dev client.

```bash
npm install
npx expo prebuild          # generates android/ and ios/ native projects
npx expo run:android       # or: npx expo run:ios
```

For day-to-day development after the first native build:
```bash
npm start                  # starts Metro for the dev client
```

### Building with EAS (recommended for device testing / distribution)

```bash
npm install -g eas-cli
eas login
eas init                   # writes your project id into app.config.ts extra.eas
eas build --profile development --platform android
```

## 5. Data model (Postgres)

- `profiles` — `id (= auth.users.id), email, display_name, avatar_url, about, expo_push_tokens[]`
- `chats` — `type, created_by, group_name, group_photo, last_message (jsonb), updated_at`
- `chat_members` — join table `(chat_id, user_id, unread_count)`; membership drives all
  RLS access to a chat and its messages (see `is_chat_member()` in the migration)
- `messages` — `chat_id, sender_id, type, text, media_url, status, read_by[]`
- `calls` — `caller_id, callee_id, type, status, offer (jsonb), answer (jsonb)`
- `call_candidates` — ICE candidates, one row per candidate, tagged by `sender_id`

Two Postgres functions (`increment_unread_counts`, `mark_messages_read`) exist because
those operations need atomic SQL expressions (`+1`, `array_append`) that a plain
client-side `.update()` can't express safely.

## 6. Realtime chat & presence

Chat list/messages use Supabase Realtime's `postgres_changes` — since Postgres
doesn't diff changed rows for you the way Firestore's listeners did, the client
simply refetches the relevant query on any change notification (cheap at this app's
scale, and much less error-prone than hand-rolled incremental patching).

Online status uses Supabase **Realtime Presence**: every signed-in device joins one
shared channel keyed by its user id and calls `track()`; presence clears automatically
if the socket drops, so there's no manual "last seen" bookkeeping to get wrong.

## 7. Voice/video calls

Calling uses plain WebRTC. Unlike a typical broadcast-channel signaling setup, the
offer/answer/ICE candidates are written as rows in `calls` / `call_candidates` rather
than sent as ephemeral broadcast events — that avoids a race where a callee who
subscribes a moment late would simply miss the offer. Two public STUN servers are
configured by default in `src/hooks/useWebRTCCall.ts`. **For reliable calls across
real-world networks (carrier NAT, corporate firewalls), add a TURN server** (e.g.
Twilio Network Traversal Service, or a self-hosted coturn) to the `ICE_SERVERS` list
before shipping.

## 8. Finding people to chat with

Since there's no phone number or contact list in this app, starting a new chat works
by searching the user directory (`profiles`) by name or email (see `NewChatScreen`),
similar to Slack rather than WhatsApp's contacts-based model.
