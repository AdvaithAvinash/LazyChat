import { supabase } from '@/config/supabase';
import type { Call, CallStatus, CallType } from '@/types';
import type { Database } from '@/types/database';

type CallRow = Database['public']['Tables']['calls']['Row'];
type CandidateRow = Database['public']['Tables']['call_candidates']['Row'];

function callFromRow(row: CallRow): Call {
  return {
    id: row.id,
    callerId: row.caller_id,
    callerName: row.caller_name,
    calleeId: row.callee_id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    offer: row.offer,
    answer: row.answer,
  };
}

export async function createCallDoc(
  callerId: string,
  callerName: string,
  calleeId: string,
  type: CallType
): Promise<string> {
  const { data, error } = await supabase
    .from('calls')
    .insert({ caller_id: callerId, caller_name: callerName, callee_id: calleeId, type })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function setCallOffer(callId: string, offer: { sdp: string; type: string }): Promise<void> {
  const { error } = await supabase.from('calls').update({ offer }).eq('id', callId);
  if (error) throw error;
}

export async function setCallAnswer(callId: string, answer: { sdp: string; type: string }): Promise<void> {
  const { error } = await supabase.from('calls').update({ answer }).eq('id', callId);
  if (error) throw error;
}

export async function updateCallStatus(callId: string, status: CallStatus): Promise<void> {
  const { error } = await supabase.from('calls').update({ status }).eq('id', callId);
  if (error) throw error;
}

/** Fetches the call once, then re-fetches on every update (offer/answer/status). */
export function subscribeToCallDoc(callId: string, callback: (call: Call | null) => void) {
  let cancelled = false;

  const refresh = async () => {
    const { data, error } = await supabase.from('calls').select('*').eq('id', callId).maybeSingle();
    if (cancelled) return;
    callback(error || !data ? null : callFromRow(data));
  };

  refresh();

  const channel = supabase
    .channel(`call:${callId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}` }, refresh)
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function addIceCandidate(callId: string, senderId: string, candidate: unknown): Promise<void> {
  const { error } = await supabase
    .from('call_candidates')
    .insert({ call_id: callId, sender_id: senderId, candidate: candidate as Record<string, unknown> });
  if (error) throw error;
}

/** Delivers every candidate from the *other* participant — an initial catch-up
 * fetch (for candidates sent before we subscribed) plus live inserts after. */
export function subscribeToIceCandidates(
  callId: string,
  myUid: string,
  onCandidate: (candidate: Record<string, unknown>) => void
) {
  let cancelled = false;
  const seen = new Set<string>();

  const emit = (row: CandidateRow) => {
    if (row.sender_id === myUid || seen.has(row.id)) return;
    seen.add(row.id);
    onCandidate(row.candidate);
  };

  supabase
    .from('call_candidates')
    .select('*')
    .eq('call_id', callId)
    .then(({ data, error }) => {
      if (error || cancelled) return;
      (data ?? []).forEach(emit);
    });

  const channel = supabase
    .channel(`call-candidates:${callId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'call_candidates', filter: `call_id=eq.${callId}` },
      (payload) => emit(payload.new as CandidateRow)
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/** Rings the current user whenever a new call targets them. */
export function subscribeToIncomingCalls(uid: string, onIncoming: (call: Call) => void) {
  const channel = supabase
    .channel(`incoming-calls:${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${uid}` },
      (payload) => {
        const row = payload.new as CallRow;
        if (row.status === 'ringing') onIncoming(callFromRow(row));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
