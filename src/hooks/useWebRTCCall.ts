import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

import {
  addIceCandidate,
  CALLEE_CANDIDATES,
  CALLER_CANDIDATES,
  createCallDoc,
  setCallAnswer,
  setCallOffer,
  subscribeToCallDoc,
  subscribeToIceCandidates,
  updateCallStatus,
} from '@/services/callService';
import type { Call, CallType } from '@/types';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // For production, add a TURN server here (e.g. Twilio/Metered) so calls
  // work across restrictive NATs/carrier networks — public STUN alone isn't
  // enough for a meaningful fraction of real-world connections.
];

type Params = {
  callId?: string;
  peerId: string;
  currentUserId: string;
  currentUserName: string;
  type: CallType;
  isCaller: boolean;
};

type ConnectionState = 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed';

export function useWebRTCCall({
  callId: initialCallId,
  peerId,
  currentUserId,
  currentUserName,
  type,
  isCaller,
}: Params) {
  const [callId, setCallId] = useState<string | undefined>(initialCallId);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(type === 'video');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const cleanup = useCallback(() => {
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
  }, [localStream]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event: { streams: MediaStream[] }) => {
        setRemoteStream(event.streams[0]);
        setConnectionState('connected');
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') setConnectionState('failed');
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          setConnectionState('ended');
        }
      };

      if (isCaller) {
        const newCallId =
          initialCallId ?? (await createCallDoc(currentUserId, currentUserName, peerId, type));
        setCallId(newCallId);
        setConnectionState('ringing');

        pc.onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
          if (event.candidate) addIceCandidate(newCallId, CALLER_CANDIDATES, event.candidate.toJSON());
        };

        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        await setCallOffer(newCallId, { sdp: offer.sdp ?? '', type: offer.type ?? 'offer' });

        const unsubCall = subscribeToCallDoc(newCallId, async (call: Call | null) => {
          if (!call?.answer || pc.remoteDescription) return;
          await pc.setRemoteDescription(new RTCSessionDescription(call.answer as RTCSessionDescription));
        });

        const unsubCandidates = subscribeToIceCandidates(newCallId, CALLEE_CANDIDATES, (candidate) => {
          pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidate));
        });

        unsubscribersRef.current.push(unsubCall, unsubCandidates);
      } else if (initialCallId) {
        pc.onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
          if (event.candidate) addIceCandidate(initialCallId, CALLEE_CANDIDATES, event.candidate.toJSON());
        };

        const unsubCandidates = subscribeToIceCandidates(initialCallId, CALLER_CANDIDATES, (candidate) => {
          pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidate));
        });
        unsubscribersRef.current.push(unsubCandidates);

        const unsubCall = subscribeToCallDoc(initialCallId, async (call: Call | null) => {
          if (!call?.offer || pc.remoteDescription) return;
          await pc.setRemoteDescription(new RTCSessionDescription(call.offer as RTCSessionDescription));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await setCallAnswer(initialCallId, { sdp: answer.sdp ?? '', type: answer.type ?? 'answer' });
          await updateCallStatus(initialCallId, 'accepted');
        });
        unsubscribersRef.current.push(unsubCall);
      }
    }

    start().catch(() => setConnectionState('failed'));

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted((prev) => !prev);
  }, [localStream, muted]);

  const toggleVideo = useCallback(() => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !videoEnabled;
    });
    setVideoEnabled((prev) => !prev);
  }, [localStream, videoEnabled]);

  const hangUp = useCallback(async () => {
    if (callId) await updateCallStatus(callId, 'ended').catch(() => undefined);
    cleanup();
    setConnectionState('ended');
  }, [callId, cleanup]);

  return {
    callId,
    localStream,
    remoteStream,
    connectionState,
    muted,
    videoEnabled,
    toggleMute,
    toggleVideo,
    hangUp,
  };
}
