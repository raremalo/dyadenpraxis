import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ScheduledSessionStatus = 'proposed' | 'scheduled' | 'cancelled' | 'completed' | 'rejected';

export interface ScheduledSessionPartner {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface ScheduledSession {
  id: string;
  created_at: string;
  updated_at: string;
  session_id: string | null;
  requester_id: string;
  partner_id: string;
  scheduled_for: string;
  duration: number;
  level: number;
  status: ScheduledSessionStatus;
  reminder_sent: boolean;
  notes: string | null;
  message: string | null;
  pending_response_from: string | null;
  requester?: ScheduledSessionPartner;
  partner?: ScheduledSessionPartner;
}

export interface CreateScheduledSessionInput {
  partner_id: string;
  scheduled_for: string; // ISO datetime string
  duration?: number;
  level?: number;
  message?: string;
}

interface UseScheduledSessionsReturn {
  // Data
  scheduledSessions: ScheduledSession[];
  pendingRequests: ScheduledSession[];
  upcomingSessions: ScheduledSession[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadScheduledSessions: () => Promise<void>;
  proposeSession: (input: CreateScheduledSessionInput) => Promise<ScheduledSession | null>;
  acceptProposal: (sessionId: string) => Promise<boolean>;
  rejectProposal: (sessionId: string) => Promise<boolean>;
  cancelScheduledSession: (sessionId: string) => Promise<boolean>;
  
  // Realtime
  subscribeToScheduledSessions: () => void;
  unsubscribe: () => void;
}

export function useScheduledSessions(): UseScheduledSessionsReturn {
  const { user } = useAuth();
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Derived: Pending requests (where I need to respond)
  const pendingRequests = scheduledSessions.filter(
    s => s.status === 'proposed' && s.pending_response_from === user?.id
  );

  // Derived: Upcoming scheduled sessions
  const upcomingSessions = scheduledSessions.filter(
    s => s.status === 'scheduled' && new Date(s.scheduled_for) > new Date()
  ).sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());

  // Load all scheduled sessions for current user
  const loadScheduledSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('scheduled_sessions')
        .select(`
          *,
          requester:profiles!requester_id(id, name, avatar_url),
          partner:profiles!partner_id(id, name, avatar_url)
        `)
        .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('scheduled_for', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      setScheduledSessions(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Geplante Sitzungen laden fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Propose a new session
  const proposeSession = useCallback(async (input: CreateScheduledSessionInput): Promise<ScheduledSession | null> => {
    if (!user) return null;
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('scheduled_sessions')
        .insert({
          requester_id: user.id,
          partner_id: input.partner_id,
          scheduled_for: input.scheduled_for,
          duration: input.duration ?? 15,
          level: input.level ?? 1,
          status: 'proposed',
          message: input.message || null,
          pending_response_from: input.partner_id,
        })
        .select(`
          *,
          requester:profiles!requester_id(id, name, avatar_url),
          partner:profiles!partner_id(id, name, avatar_url)
        `)
        .single();

      if (insertError) throw new Error(insertError.message);
      
      setScheduledSessions(prev => [...prev, data]);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terminvorschlag senden fehlgeschlagen';
      setError(msg);
      return null;
    }
  }, [user]);

  // Accept a proposal
  const acceptProposal = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('scheduled_sessions')
        .update({
          status: 'scheduled',
          pending_response_from: null,
        })
        .eq('id', sessionId)
        .eq('pending_response_from', user.id);

      if (updateError) throw new Error(updateError.message);
      
      // Update local state
      setScheduledSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, status: 'scheduled' as ScheduledSessionStatus, pending_response_from: null }
          : s
      ));
      
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terminvorschlag annehmen fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user]);

  // Reject a proposal
  const rejectProposal = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('scheduled_sessions')
        .update({
          status: 'rejected',
          pending_response_from: null,
        })
        .eq('id', sessionId)
        .eq('pending_response_from', user.id);

      if (updateError) throw new Error(updateError.message);
      
      // Update local state
      setScheduledSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, status: 'rejected' as ScheduledSessionStatus, pending_response_from: null }
          : s
      ));
      
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terminvorschlag ablehnen fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user]);

  // Cancel a scheduled session
  const cancelScheduledSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('scheduled_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId)
        .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`);

      if (updateError) throw new Error(updateError.message);
      
      // Update local state
      setScheduledSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, status: 'cancelled' as ScheduledSessionStatus }
          : s
      ));
      
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Termin absagen fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user]);

  // Subscribe to realtime updates
  const subscribeToScheduledSessions = useCallback(() => {
    if (!user) return;
    
    // Unsubscribe from previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`scheduled_sessions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_sessions',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSession = payload.new as ScheduledSession;
            // Only add if we're involved
            if (newSession.requester_id === user.id || newSession.partner_id === user.id) {
              // Fetch with profiles
              const { data } = await supabase
                .from('scheduled_sessions')
                .select(`
                  *,
                  requester:profiles!requester_id(id, name, avatar_url),
                  partner:profiles!partner_id(id, name, avatar_url)
                `)
                .eq('id', newSession.id)
                .single();
              
              if (data) {
                setScheduledSessions(prev => [...prev, data]);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ScheduledSession;
            setScheduledSessions(prev => prev.map(s => 
              s.id === updated.id ? { ...s, ...updated } : s
            ));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setScheduledSessions(prev => prev.filter(s => s.id !== deleted.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [user]);

  // Unsubscribe
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Load on mount and subscribe
  useEffect(() => {
    if (user) {
      loadScheduledSessions();
      subscribeToScheduledSessions();
    }
    
    return () => {
      unsubscribe();
    };
  }, [user, loadScheduledSessions, subscribeToScheduledSessions, unsubscribe]);

  return {
    scheduledSessions,
    pendingRequests,
    upcomingSessions,
    isLoading,
    error,
    loadScheduledSessions,
    proposeSession,
    acceptProposal,
    rejectProposal,
    cancelScheduledSession,
    subscribeToScheduledSessions,
    unsubscribe,
  };
}
