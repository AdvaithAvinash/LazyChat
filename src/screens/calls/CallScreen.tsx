import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/types';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { colors } from '@/theme/colors';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type CallRoute = RouteProp<MainStackParamList, 'Call'>;

const statusLabel: Record<string, string> = {
  connecting: 'Connecting…',
  ringing: 'Ringing…',
  connected: 'Connected',
  ended: 'Call ended',
  failed: 'Connection failed',
};

export default function CallScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<CallRoute>();
  const { peerId, peerName, type, isCaller, callId } = route.params;

  const call = useWebRTCCall({
    callId,
    peerId,
    currentUserId: profile?.uid ?? '',
    currentUserName: profile?.displayName ?? '',
    type,
    isCaller,
  });

  useEffect(() => {
    if (call.connectionState === 'ended' || call.connectionState === 'failed') {
      const timeout = setTimeout(() => navigation.goBack(), 1200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [call.connectionState, navigation]);

  const handleHangUp = async () => {
    await call.hangUp();
    navigation.goBack();
  };

  const isVideo = type === 'video' && call.videoEnabled;

  return (
    <View style={styles.container}>
      {isVideo && call.remoteStream ? (
        <RTCView streamURL={call.remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
      ) : (
        <View style={styles.avatarStage}>
          <Avatar name={peerName} size={140} />
          <Text style={styles.peerName}>{peerName}</Text>
          <Text style={styles.status}>{statusLabel[call.connectionState] ?? ''}</Text>
        </View>
      )}

      {isVideo && call.localStream ? (
        <RTCView streamURL={call.localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
      ) : null}

      {isVideo ? (
        <View style={styles.videoHeader}>
          <Text style={styles.peerNameSmall}>{peerName}</Text>
          <Text style={styles.statusSmall}>{statusLabel[call.connectionState] ?? ''}</Text>
        </View>
      ) : null}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={call.toggleMute}>
          <Text style={styles.controlIcon}>{call.muted ? '🔇' : '🎙️'}</Text>
        </TouchableOpacity>

        {type === 'video' ? (
          <TouchableOpacity style={styles.controlButton} onPress={call.toggleVideo}>
            <Text style={styles.controlIcon}>{call.videoEnabled ? '📷' : '🚫'}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={[styles.controlButton, styles.hangUp]} onPress={handleHangUp}>
          <Text style={styles.controlIcon}>📵</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  avatarStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  peerName: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 20 },
  status: { color: colors.textMuted, fontSize: 15, marginTop: 8 },
  remoteVideo: { ...StyleSheet.absoluteFillObject },
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 110,
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  videoHeader: { position: 'absolute', top: 60, left: 20 },
  peerNameSmall: { color: colors.text, fontSize: 18, fontWeight: '700' },
  statusSmall: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  controls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  hangUp: { backgroundColor: colors.danger },
  controlIcon: { fontSize: 26 },
});
