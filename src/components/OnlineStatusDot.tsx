import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { subscribeToPresence } from '@/services/presenceService';
import { colors } from '@/theme/colors';

type Props = {
  uid: string;
  size?: number;
};

export default function OnlineStatusDot({ uid, size = 12 }: Props) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPresence(uid, (presence) => setOnline(presence.state === 'online'));
    return unsubscribe;
  }, [uid]);

  if (!online) return null;

  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
