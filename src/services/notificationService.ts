import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { firebaseMessaging } from '@/config/firebase';
import { removeFcmToken, updateFcmToken } from '@/services/userService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers the device for FCM push notifications and stores the token on
 * the user's profile so a Cloud Function (see functions/) can target it when
 * a new message arrives while the app is backgrounded/killed.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  const authStatus = await firebaseMessaging.requestPermission();
  const enabled =
    authStatus === 1 /* AUTHORIZED */ || authStatus === 2 /* PROVISIONAL */;
  if (!enabled) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await firebaseMessaging.getToken();
  await updateFcmToken(uid, token);

  firebaseMessaging.onTokenRefresh((newToken) => {
    updateFcmToken(uid, newToken).catch(() => undefined);
  });

  return token;
}

export async function unregisterPushNotifications(uid: string): Promise<void> {
  const token = await firebaseMessaging.getToken();
  await removeFcmToken(uid, token);
  await firebaseMessaging.deleteToken();
}

/** Foreground message handler — shows a local notification since FCM does
 * not surface a system notification for foreground app state on its own. */
export function subscribeToForegroundMessages(
  onMessage: (title: string, body: string, data: Record<string, string>) => void
) {
  return firebaseMessaging.onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? 'LazyChat';
    const body = remoteMessage.notification?.body ?? '';
    const data = (remoteMessage.data as Record<string, string>) ?? {};

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });

    onMessage(title, body, data);
  });
}

export function subscribeToNotificationOpened(
  onOpen: (data: Record<string, string>) => void
) {
  const unsubscribeOpened = firebaseMessaging.onNotificationOpenedApp((remoteMessage) => {
    onOpen((remoteMessage.data as Record<string, string>) ?? {});
  });

  firebaseMessaging
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) onOpen((remoteMessage.data as Record<string, string>) ?? {});
    })
    .catch(() => undefined);

  return unsubscribeOpened;
}
