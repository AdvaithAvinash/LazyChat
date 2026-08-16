import { env } from '@/config/env';
import { removePushSubscription, savePushSubscription } from '@/services/userService';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Registers this browser for Web Push and stores the subscription (endpoint
 * + keys) so the `send-push` Supabase Edge Function can target it when a new
 * message arrives while the tab is backgrounded or closed. The actual
 * notification display and click handling lives in public/sw.js — a service
 * worker, not this module, is what receives the 'push' event.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  if (!env.vapidPublicKey) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey) as unknown as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;

  await savePushSubscription(uid, { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
  return json.endpoint;
}

export async function unregisterPushNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await removePushSubscription(endpoint).catch(() => undefined);
}
