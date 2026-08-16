import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { FieldValue, firestoreDb } from '@/config/firebase';
import type { Call, CallStatus, CallType } from '@/types';

export const CALLER_CANDIDATES = 'callerCandidates';
export const CALLEE_CANDIDATES = 'calleeCandidates';

function callFromDoc(doc: FirebaseFirestoreTypes.DocumentSnapshot): Call {
  const data = doc.data() as Omit<Call, 'id'>;
  return { id: doc.id, ...data };
}

export async function createCallDoc(
  callerId: string,
  callerName: string,
  calleeId: string,
  type: CallType
): Promise<string> {
  const ref = firestoreDb.collection('calls').doc();
  await ref.set({
    callerId,
    callerName,
    calleeId,
    type,
    status: 'ringing' satisfies CallStatus,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function setCallOffer(
  callId: string,
  offer: { sdp: string; type: string }
): Promise<void> {
  await firestoreDb.collection('calls').doc(callId).set({ offer }, { merge: true });
}

export async function setCallAnswer(
  callId: string,
  answer: { sdp: string; type: string }
): Promise<void> {
  await firestoreDb.collection('calls').doc(callId).set({ answer }, { merge: true });
}

export async function updateCallStatus(callId: string, status: CallStatus): Promise<void> {
  await firestoreDb.collection('calls').doc(callId).set({ status }, { merge: true });
}

export function subscribeToCallDoc(callId: string, callback: (call: Call | null) => void) {
  return firestoreDb
    .collection('calls')
    .doc(callId)
    .onSnapshot((doc) => callback(doc.exists ? callFromDoc(doc) : null));
}

export async function addIceCandidate(
  callId: string,
  subcollection: typeof CALLER_CANDIDATES | typeof CALLEE_CANDIDATES,
  candidate: unknown
): Promise<void> {
  await firestoreDb.collection('calls').doc(callId).collection(subcollection).add(candidate as object);
}

export function subscribeToIceCandidates(
  callId: string,
  subcollection: typeof CALLER_CANDIDATES | typeof CALLEE_CANDIDATES,
  onCandidate: (candidate: FirebaseFirestoreTypes.DocumentData) => void
) {
  return firestoreDb
    .collection('calls')
    .doc(callId)
    .collection(subcollection)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') onCandidate(change.doc.data());
      });
    });
}

/** Rings the current user whenever a new call document targets them. */
export function subscribeToIncomingCalls(uid: string, onIncoming: (call: Call) => void) {
  return firestoreDb
    .collection('calls')
    .where('calleeId', '==', uid)
    .where('status', '==', 'ringing')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') onIncoming(callFromDoc(change.doc));
      });
    });
}
