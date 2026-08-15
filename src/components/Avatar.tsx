import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

type Props = {
  name: string;
  photoURL?: string | null;
  size?: number;
};

export default function Avatar({ name, photoURL, size = 48 }: Props) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={[styles.image, dimensionStyle]} />;
  }

  return (
    <View style={[styles.placeholder, dimensionStyle]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceAlt },
  placeholder: {
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.text, fontWeight: '600' },
});
