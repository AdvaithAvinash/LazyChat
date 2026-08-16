import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addExpoPushToken, removeExpoPushToken } from '@/services/userService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getProjectId(): string | undefined {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId !== 'REPLACE_WITH_EAS_PROJECT_ID' ? projectId : undefined;
}

/**
 * Registers the device for Expo push notifications and stores the resulting
 * push token on the user's profile so the `send-push` Supabase Edge Function
 * (see supabase/functions/send-push) can target it when a new message
 * arrives while the app is backgrounded/killed. Unlike the Firebase build,
 * this needs no Firebase project in app code — Expo's push service handles
 * routing to APNs/FCM on your behalf; see README for the one Android-only
 * caveat (an FCM credential still has to be uploaded to EAS, since that's an
 * OS-level requirement, not something any backend choice can avoid).
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: getProjectId() });
  await addExpoPushToken(uid, token);
  return token;
}

export async function unregisterPushNotifications(uid: string): Promise<void> {
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: getProjectId() });
  await removeExpoPushToken(uid, token);
}

/** Foreground handler — surfaces a local notification banner while the app is open. */
export function subscribeToForegroundMessages(
  onMessage: (title: string, body: string, data: Record<string, string>) => void
) {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body, data } = notification.request.content;
    onMessage(title ?? 'LazyChat', body ?? '', (data as Record<string, string>) ?? {});
  });
  return () => subscription.remove();
}

export function subscribeToNotificationOpened(onOpen: (data: Record<string, string>) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data as Record<string, string>) ?? {};
    onOpen(data);
  });

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) {
        const data = (response.notification.request.content.data as Record<string, string>) ?? {};
        onOpen(data);
      }
    })
    .catch(() => undefined);

  return () => subscription.remove();
}
