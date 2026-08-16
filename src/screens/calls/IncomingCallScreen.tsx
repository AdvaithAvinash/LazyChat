import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Avatar from '@/components/Avatar';
import type { MainStackParamList } from '@/navigation/types';
import { updateCallStatus } from '@/services/callService';
import { colors } from '@/theme/colors';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type IncomingRoute = RouteProp<MainStackParamList, 'IncomingCall'>;

export default function IncomingCallScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<IncomingRoute>();
  const { callId, callerId, callerName, type } = route.params;

  const handleDecline = async () => {
    await updateCallStatus(callId, 'declined');
    navigation.goBack();
  };

  const handleAccept = () => {
    navigation.navigate('Call', {
      peerId: callerId,
      peerName: callerName,
      type,
      isCaller: false,
      callId,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Avatar name={callerName} size={140} />
        <Text style={styles.name}>{callerName}</Text>
        <Text style={styles.subtitle}>Incoming {type} call…</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={handleDecline}>
          <Text style={[styles.buttonIcon, styles.decline]}>📵</Text>
          <Text style={styles.buttonLabel}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleAccept}>
          <Text style={[styles.buttonIcon, styles.accept]}>{type === 'video' ? '🎥' : '📞'}</Text>
          <Text style={styles.buttonLabel}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between', paddingBottom: 60 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 26, fontWeight: '700', marginTop: 20 },
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly' },
  button: { alignItems: 'center' },
  buttonIcon: {
    fontSize: 26,
    width: 68,
    height: 68,
    borderRadius: 34,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 68,
    overflow: 'hidden',
  },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.success },
  buttonLabel: { color: colors.text, marginTop: 10 },
});
