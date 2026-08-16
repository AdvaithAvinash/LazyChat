import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';

import ChatListScreen from '@/screens/chats/ChatListScreen';
import NewChatScreen from '@/screens/chats/NewChatScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import { colors } from '@/theme/colors';
import type { MainTabParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<keyof MainTabParamList, string> = {
  ChatsTab: '💬',
  ContactsTab: '👥',
  SettingsTab: '⚙️',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: () => <Text>{icons[route.name as keyof MainTabParamList]}</Text>,
      })}
    >
      <Tab.Screen name="ChatsTab" component={ChatListScreen} options={{ tabBarLabel: 'Chats' }} />
      <Tab.Screen name="ContactsTab" component={NewChatScreen} options={{ tabBarLabel: 'Contacts' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
