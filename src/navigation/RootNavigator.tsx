import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import AuthFlow from '@/navigation/AuthFlow';
import MainTabs from '@/navigation/MainTabs';
import type { MainStackParamList } from '@/navigation/types';
import CallScreen from '@/screens/calls/CallScreen';
import IncomingCallScreen from '@/screens/calls/IncomingCallScreen';
import ChatRoomScreen from '@/screens/chats/ChatRoomScreen';
import NewChatScreen from '@/screens/chats/NewChatScreen';
import ProfileSetupScreen from '@/screens/auth/ProfileSetupScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import { subscribeToIncomingCalls } from '@/services/callService';
import { subscribeToNotificationOpened } from '@/services/notificationService';
import { colors } from '@/theme/colors';

const Stack = createNativeStackNavigator<MainStackParamList>();
export const navigationRef = createNavigationContainerRef<MainStackParamList>();

function MainStack() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) return undefined;

    const unsubscribeCalls = subscribeToIncomingCalls(profile.uid, (call) => {
      if (!navigationRef.isReady()) return;
      navigationRef.navigate('IncomingCall', {
        callId: call.id,
        callerId: call.callerId,
        callerName: call.callerName,
        type: call.type,
      });
    });

    const unsubscribeNotifications = subscribeToNotificationOpened((data) => {
      if (data.type === 'message' && data.chatId && navigationRef.isReady()) {
        navigationRef.navigate('ChatRoom', { chatId: data.chatId });
      }
    });

    return () => {
      unsubscribeCalls();
      unsubscribeNotifications();
    };
  }, [profile]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Call" component={CallScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { firebaseUser, loading, profileComplete } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!firebaseUser ? <AuthFlow /> : !profileComplete ? <ProfileSetupScreen /> : <MainStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
