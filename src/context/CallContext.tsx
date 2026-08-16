'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import CallOverlay from '@/components/CallOverlay';
import IncomingCallBanner from '@/components/IncomingCallBanner';
import { useAuth } from '@/context/AuthContext';
import { subscribeToCallDoc, subscribeToIncomingCalls, updateCallStatus } from '@/services/callService';
import type { Call, CallType } from '@/types';

export type ActiveCall = {
  callId?: string;
  peerId: string;
  peerName: string;
  type: CallType;
  isCaller: boolean;
};

type CallContextValue = {
  incomingCall: Call | null;
  activeCall: ActiveCall | null;
  startCall: (peerId: string, peerName: string, type: CallType) => void;
  acceptIncomingCall: () => void;
  declineIncomingCall: () => void;
  endCall: () => void;
};

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    if (!profile) return undefined;
    return subscribeToIncomingCalls(profile.uid, setIncomingCall);
  }, [profile]);

  // Dismiss the banner if the caller cancels, or the call gets answered
  // from elsewhere, before this device responds.
  useEffect(() => {
    if (!incomingCall) return undefined;
    return subscribeToCallDoc(incomingCall.id, (call) => {
      if (!call || call.status !== 'ringing') setIncomingCall(null);
    });
  }, [incomingCall]);

  const startCall = useCallback((peerId: string, peerName: string, type: CallType) => {
    setActiveCall({ peerId, peerName, type, isCaller: true });
  }, []);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    setActiveCall({
      callId: incomingCall.id,
      peerId: incomingCall.callerId,
      peerName: incomingCall.callerName,
      type: incomingCall.type,
      isCaller: false,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const declineIncomingCall = useCallback(() => {
    if (incomingCall) updateCallStatus(incomingCall.id, 'declined').catch(() => undefined);
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(() => setActiveCall(null), []);

  return (
    <CallContext.Provider
      value={{ incomingCall, activeCall, startCall, acceptIncomingCall, declineIncomingCall, endCall }}
    >
      {children}
      {incomingCall && !activeCall ? (
        <IncomingCallBanner call={incomingCall} onAccept={acceptIncomingCall} onDecline={declineIncomingCall} />
      ) : null}
      {activeCall ? <CallOverlay call={activeCall} onEnd={endCall} /> : null}
    </CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
}
