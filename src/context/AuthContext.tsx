import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { fetchUserProfile, subscribeToAuthState } from '@/services/authService';
import { startPresenceTracking } from '@/services/presenceService';
import { registerForPushNotifications } from '@/services/notificationService';
import type { UserProfile } from '@/types';

type AuthContextValue = {
  firebaseUser: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileComplete: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthState(async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userProfile = await fetchUserProfile(user.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return undefined;

    const stopPresence = startPresenceTracking(firebaseUser.uid);
    registerForPushNotifications(firebaseUser.uid).catch(() => undefined);

    return stopPresence;
  }, [firebaseUser]);

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    const userProfile = await fetchUserProfile(firebaseUser.uid);
    setProfile(userProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
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
