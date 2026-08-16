'use client';

import { useEffect, useRef } from 'react';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import type { ActiveCall } from '@/context/CallContext';

const statusLabel: Record<string, string> = {
  connecting: 'Connecting…',
  ringing: 'Ringing…',
  connected: 'Connected',
  ended: 'Call ended',
  failed: 'Connection failed',
};

type Props = {
  call: ActiveCall;
  onEnd: () => void;
};

export default function CallOverlay({ call, onEnd }: Props) {
  const { profile } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const webrtc = useWebRTCCall({
    callId: call.callId,
    peerId: call.peerId,
    currentUserId: profile?.uid ?? '',
    currentUserName: profile?.displayName ?? '',
    type: call.type,
    isCaller: call.isCaller,
  });

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = webrtc.localStream;
  }, [webrtc.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = webrtc.remoteStream;
  }, [webrtc.remoteStream]);

  useEffect(() => {
    if (webrtc.connectionState === 'ended' || webrtc.connectionState === 'failed') {
      const timeout = setTimeout(onEnd, 1200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [webrtc.connectionState, onEnd]);

  const handleHangUp = async () => {
    await webrtc.hangUp();
    onEnd();
  };

  const isVideo = call.type === 'video' && webrtc.videoEnabled;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {isVideo && webrtc.remoteStream ? (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <Avatar name={call.peerName} size={140} />
          <p className="mt-5 text-2xl font-bold text-text">{call.peerName}</p>
          <p className="mt-2 text-text-muted">{statusLabel[webrtc.connectionState] ?? ''}</p>
        </div>
      )}

      {isVideo && webrtc.localStream ? (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute right-5 top-14 h-36 w-28 rounded-xl bg-surface object-cover"
        />
      ) : null}

      {isVideo ? (
        <div className="absolute left-5 top-14">
          <p className="text-lg font-bold text-text">{call.peerName}</p>
          <p className="mt-0.5 text-sm text-text-muted">{statusLabel[webrtc.connectionState] ?? ''}</p>
        </div>
      ) : null}

      <div className="mb-14 flex justify-center gap-4">
        <button
          onClick={webrtc.toggleMute}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt text-2xl"
          title={webrtc.muted ? 'Unmute' : 'Mute'}
        >
          {webrtc.muted ? '🔇' : '🎙️'}
        </button>

        {call.type === 'video' ? (
          <button
            onClick={webrtc.toggleVideo}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt text-2xl"
            title={webrtc.videoEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            {webrtc.videoEnabled ? '📷' : '🚫'}
          </button>
        ) : null}

        <button
          onClick={handleHangUp}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-danger text-2xl"
          title="Hang up"
        >
          📵
        </button>
      </div>
    </div>
  );
}
