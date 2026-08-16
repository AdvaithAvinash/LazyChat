# LazyChat

A cross-platform messaging app (React Native + Expo) with phone/OTP login, real-time
1:1 chat, media sharing, push notifications, online presence, and WebRTC voice/video
calls.

## Stack

| Feature | Technology |
|---|---|
| Login / OTP | Firebase Authentication (Phone) |
| Real-time chat | Firebase Firestore |
| Images / files | Cloudinary (unsigned upload) |
| Push notifications | Firebase Cloud Messaging |
| User profiles | Firestore |
| Online status | Firestore + Firebase Realtime Database |
| Voice / video calls | WebRTC (`react-native-webrtc`), signaled over Firestore |
| Backend logic | Cloud Functions (send push on new message / incoming call) |

## Project layout

```
App.tsx                     App entry: providers + navigation
src/
  config/                   Firebase, Cloudinary, env loading
  context/AuthContext.tsx   Auth state, profile, presence, push registration
  services/                 All backend I/O (auth, chat, messages, presence,
                             storage/Cloudinary, notifications, calls)
  hooks/useWebRTCCall.ts     WebRTC peer connection + Firestore signaling
  navigation/               Root/Auth/Tab navigators, route param types
  screens/                  auth/, chats/, calls/, profile/, settings/
  components/               Avatar, MessageBubble, ChatListItem, ...
functions/                  Firebase Cloud Functions (push notifications)
firestore.rules             Firestore security rules
firestore.indexes.json      Composite indexes
database.rules.json         Realtime Database rules (presence)
firebase.json                Firebase project config
```

## 1. Firebase project setup

1. Create a project at https://console.firebase.google.com.
2. **Authentication** → Sign-in method → enable **Phone**.
3. **Firestore Database** → create in production mode.
4. **Realtime Database** → create (used only for presence).
5. **Cloud Messaging** → no extra setup needed beyond adding the apps below.
6. Add an **Android app** (package `com.lazychat.app`) and an **iOS app**
   (bundle id `com.lazychat.app`). Download:
   - `google-services.json` → place at repo root.
   - `GoogleService-Info.plist` → place at repo root.
   (Both are gitignored — never commit real Firebase credentials.)
7. Deploy security rules and indexes:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add   # select your project
   firebase deploy --only firestore:rules,firestore:indexes,database
   ```
8. Deploy the Cloud Functions that send push notifications:
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

### Android SHA-1/SHA-256 (required for Phone Auth)

Phone Auth on Android needs your debug/release signing cert fingerprints
registered on the Firebase Android app (Project settings → Your apps → Add
fingerprint). Get the debug one with:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## 2. Cloudinary setup (image/file uploads)

1. Create a free account at https://cloudinary.com.
2. Settings → Upload → Add an **unsigned** upload preset (e.g. `lazychat_unsigned`).
   Unsigned presets let the app upload directly from the device without a
   backend round trip.
3. Copy your cloud name and the preset name into `.env` (see below).

## 3. Environment variables

```bash
cp .env.example .env
```

Fill in:
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`
- `FIREBASE_DATABASE_URL` (from the Realtime Database console)
- `EAS_PROJECT_ID` (after running `eas init`, see below)

## 4. Install & run

This app uses native modules (`react-native-firebase`, `react-native-webrtc`)
that are **not** available in Expo Go — you need a custom dev client.

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

## 5. Data model (Firestore)

- `users/{uid}` — `phoneNumber, displayName, photoURL, about, presence, fcmTokens[]`
- `chats/{chatId}` — `type, participants[], participantDetails, lastMessage, unreadCount, updatedAt`
  - `chats/{chatId}/messages/{messageId}` — `senderId, type, text, mediaUrl, status, readBy[]`
- `calls/{callId}` — `callerId, callerName, calleeId, type, status, offer, answer`
  - `calls/{callId}/callerCandidates/*`, `calleeCandidates/*` — ICE candidates

Presence lives in the Realtime Database at `/status/{uid}` (using `onDisconnect()`
for reliable offline detection) and is mirrored into `users/{uid}.presence` by the
client so the rest of the app only has to read from Firestore.

## 6. Voice/video calls

Calling uses plain WebRTC with the classic Firestore-signaling pattern (offer/answer/
ICE candidates written to a `calls/{callId}` document). Two public STUN servers are
configured by default in `src/hooks/useWebRTCCall.ts`. **For reliable calls across
real-world networks (carrier NAT, corporate firewalls) you should add a TURN server**
(e.g. Twilio Network Traversal Service, or a self-hosted coturn) to the `ICE_SERVERS`
list before shipping.

## 7. Notes on the stack table's alternatives

- **Cloudinary** is used instead of Firebase Storage for all media (images/files),
  per the free-tier tradeoffs.
- **Supabase** is not wired in — Firebase covers auth/data/presence/push in this
  build. Swapping Firestore for Supabase would mean replacing `src/services/*`
  and `src/config/firebase.ts` with a Supabase client + Postgres schema; the
  screens/components layer wouldn't need to change since they only talk to the
  service layer.
