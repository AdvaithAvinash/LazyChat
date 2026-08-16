'use client';

import type { User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { fetchUserProfile, subscribeToAuthState } from '@/services/authService';
import { registerForPushNotifications } from '@/services/notificationService';
import { startPresenceTracking } from '@/services/presenceService';
import type { UserProfile } from '@/types';

type AuthContextValue = {
  authUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileComplete: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthState(async (user) => {
      setAuthUser(user);
      if (user) {
        const userProfile = await fetchUserProfile(user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!authUser) return undefined;

    const stopPresence = startPresenceTracking(authUser.id);
    registerForPushNotifications(authUser.id).catch(() => undefined);

    return stopPresence;
  }, [authUser]);

  const refreshProfile = async () => {
    if (!authUser) return;
    const userProfile = await fetchUserProfile(authUser.id);
    setProfile(userProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        profile,
        loading,
        profileComplete: Boolean(profile?.displayName),
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
