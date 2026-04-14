import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type SessionStatus = 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled';

export interface SessionPartner {
  id: string;
  name: string;
  avatar_url: string | null;
  trust_level: 'new' | 'known' | 'verified';
  is_online: boolean;
}

export interface Session {
  id: string;
  created_at: string;
  requester_id: string;
  partner_id: string;
  level: number;
  duration: number;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: SessionStatus;
  room_url: string | null;
  room_token: string | null;
  partner_token: string | null;
  is_open: boolean;
  third_participant_id: string | null;
  third_participant_token: string | null;
  deleted_by_requester: boolean;
  deleted_by_partner: boolean;
  requester?: SessionPartner;
  partner?: SessionPartner;
}

export interface OpenSession {
  id: string;
  created_at: string;
  requester_id: string;
  requester_name: string;
  requester_avatar: string | null;
  level: number;
  duration: number;
  scheduled_at: string | null;
  status: SessionStatus;
}

export interface OpenTriad {
  id: string;
  created_at: string;
  requester_id: string;
  partner_id: string;
  requester_name: string;
  requester_avatar: string | null;
  partner_name: string;
  partner_avatar: string | null;
  level: number;
  duration: number;
  status: SessionStatus;
}

interface CreateSessionParams {
  partnerId: string;
  level: number;
  duration: number;
  isOpen?: boolean;
}

interface UseSessionReturn {
  sessions: Session[];
  openSessions: OpenSession[];
  openTriads: OpenTriad[];
  activeSession: Session | null;
  isLoading: boolean;
  error: string | null;
  loadSessions: () => Promise<void>;
  loadOpenSessions: () => Promise<void>;
  loadOpenTriads: () => Promise<void>;
  createSession: (params: CreateSessionParams) => Promise<Session | null>;
  acceptSession: (sessionId: string) => Promise<boolean>;
  startSession: (sessionId: string, roomUrl: string, requesterToken: string, partnerToken: string) => Promise<Session | null>;
  startTriadSession: (sessionId: string, roomUrl: string, requesterToken: string, partnerToken: string, thirdToken: string) => Promise<Session | null>;
  completeSession: (sessionId: string) => Promise<boolean>;
  cancelSession: (sessionId: string) => Promise<boolean>;
  joinOpenSession: (sessionId: string) => Promise<boolean>;
  joinAsThirdParticipant: (sessionId: string) => Promise<boolean>;
  getSession: (sessionId: string) => Promise<Session | null>;
  subscribeToSession: (sessionId: string, callback: (session: Session) => void) => () => void;
}

export function useSession(): UseSessionReturn {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openSessions, setOpenSessions] = useState<OpenSession[]>([]);
  const [openTriads, setOpenTriads] = useState<OpenTriad[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          *,
          requester:profiles!requester_id(id, name, avatar_url, trust_level, is_online),
          partner:profiles!partner_id(id, name, avatar_url, trust_level, is_online)
        `)
        .or(`requester_id.eq.${user.id},partner_id.eq.${user.id},third_participant_id.eq.${user.id}`)
        .eq('deleted_by_requester', false)
        .eq('deleted_by_partner', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);
      setSessions((data || []) as Session[]);

      // Set active session if any
      const active = (data || []).find(
        (s: Session) => s.status === 'active' || s.status === 'accepted'
      );
      setActiveSession(active || null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sessions laden fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadOpenSessions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase.rpc('get_open_sessions', {
        user_id: user.id,
      });

      if (fetchError) throw new Error(fetchError.message);
      setOpenSessions((data || []) as OpenSession[]);
    } catch (err) {
      console.error('[useSession] Open sessions laden fehlgeschlagen:', err);
    }
  }, [user]);

  const createSession = useCallback(async (params: CreateSessionParams): Promise<Session | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert({
          requester_id: user.id,
          partner_id: params.partnerId,
          level: params.level,
          duration: params.duration,
          is_open: params.isOpen || false,
        })
        .select(`
          *,
          requester:profiles!requester_id(id, name, avatar_url, trust_level, is_online),
          partner:profiles!partner_id(id, name, avatar_url, trust_level, is_online)
        `)
        .single();

      if (insertError) throw new Error(insertError.message);
      
      await loadSessions();
      return data as Session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session erstellen fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSessions]);

  const acceptSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ status: 'accepted' })
        .eq('id', sessionId)
        .eq('partner_id', user.id)
        .eq('status', 'pending');

      if (updateError) throw new Error(updateError.message);
      
      await loadSessions();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session akzeptieren fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSessions]);

  const startSession = useCallback(async (
    sessionId: string,
    roomUrl: string,
    requesterToken: string,
    partnerToken: string
  ): Promise<Session | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          room_url: roomUrl,
          room_token: requesterToken,
          partner_token: partnerToken,
        })
        .eq('id', sessionId)
        .select(`
          *,
          requester:profiles!requester_id(id, name, avatar_url, trust_level, is_online),
          partner:profiles!partner_id(id, name, avatar_url, trust_level, is_online)
        `)
        .single();

      if (updateError) throw new Error(updateError.message);

      const session = data as Session;
      setActiveSession(session);
      return session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session starten fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const completeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) throw new Error(updateError.message);

      // Increment sessions_completed for all participants
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        try {
          const userIds = [session.requester_id, session.partner_id];
          if (session.third_participant_id) {
            userIds.push(session.third_participant_id);
          }
          await supabase.rpc('increment_sessions_completed', {
            user_ids: userIds,
          });
        } catch {
          // RPC might not exist, ignore
        }
      }
      
      await loadSessions();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session beenden fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSessions, sessions]);

  const cancelSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId)
        .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`);

      if (updateError) throw new Error(updateError.message);
      
      await loadSessions();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session abbrechen fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSessions]);

  const joinOpenSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          partner_id: user.id,
          is_open: false,
          status: 'accepted',
        })
        .eq('id', sessionId)
        .eq('is_open', true)
        .eq('status', 'pending');

      if (updateError) throw new Error(updateError.message);
      
      await loadSessions();
      await loadOpenSessions();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session beitreten fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSessions, loadOpenSessions]);

  const loadOpenTriads = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          id, created_at, requester_id, partner_id, level, duration, status,
          requester:profiles!requester_id(name, avatar_url),
          partner:profiles!partner_id(name, avatar_url)
        `)
        .eq('is_open', true)
        .is('third_participant_id', null)
        .in('status', ['accepted', 'active'])
        .neq('requester_id', user.id)
        .neq('partner_id', user.id);

      if (fetchError) throw new Error(fetchError.message);

      const triads: OpenTriad[] = (data || []).map((s: Record<string, unknown>) => {
        const req = s.requester as Record<string, unknown> | Record<string, unknown>[] | null;
        const par = s.partner as Record<string, unknown> | Record<string, unknown>[] | null;
        const reqData = Array.isArray(req) ? req[0] : req;
        const parData = Array.isArray(par) ? par[0] : par;
        return {
          id: s.id as string,
          created_at: s.created_at as string,
          requester_id: s.requester_id as string,
          partner_id: s.partner_id as string,
          requester_name: (reqData?.name as string) || 'Unbekannt',
          requester_avatar: (reqData?.avatar_url as string) || null,
          partner_name: (parData?.name as string) || 'Unbekannt',
          partner_avatar: (parData?.avatar_url as string) || null,
          level: s.level as number,
          duration: s.duration as number,
          status: s.status as SessionStatus,
        };
      });

      setOpenTriads(triads);
    } catch (err) {
      console.error('[useSession] Offene Triaden laden fehlgeschlagen:', err);
    }
  }, [user]);

  const joinAsThirdParticipant = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          third_participant_id: user.id,
        })
        .eq('id', sessionId)
        .eq('is_open', true)
        .is('third_participant_id', null);

      if (updateError) throw new Error(updateError.message);

      await loadSessions();
      await loadOpenTriads();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Triade beitreten fehlgeschlagen';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSessions, loadOpenTriads]);

  const startTriadSession = useCallback(async (
    sessionId: string,
    roomUrl: string,
    requesterToken: string,
    partnerToken: string,
    thirdToken: string
  ): Promise<Session | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          room_url: roomUrl,
          room_token: requesterToken,
          partner_token: partnerToken,
          third_participant_token: thirdToken,
        })
        .eq('id', sessionId)
        .select(`
          *,
          requester:profiles!requester_id(id, name, avatar_url, trust_level, is_online),
          partner:profiles!partner_id(id, name, avatar_url, trust_level, is_online)
        `)
        .single();

      if (updateError) throw new Error(updateError.message);

      const session = data as Session;
      setActiveSession(session);
      return session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Triade starten fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getSession = useCallback(async (sessionId: string): Promise<Session | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          *,
          requester:profiles!requester_id(id, name, avatar_url, trust_level, is_online),
          partner:profiles!partner_id(id, name, avatar_url, trust_level, is_online)
        `)
        .eq('id', sessionId)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      return data as Session;
    } catch {
      return null;
    }
  }, []);

  const subscribeToSession = useCallback((
    sessionId: string,
    callback: (session: Session) => void
  ): (() => void) => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        async () => {
          const session = await getSession(sessionId);
          if (session) {
            callback(session);
            setActiveSession(session);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getSession]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadSessions();
      loadOpenSessions();
      loadOpenTriads();
    }
  }, [user, loadSessions, loadOpenSessions, loadOpenTriads]);

  return {
    sessions,
    openSessions,
    openTriads,
    activeSession,
    isLoading,
    error,
    loadSessions,
    loadOpenSessions,
    loadOpenTriads,
    createSession,
    acceptSession,
    startSession,
    startTriadSession,
    completeSession,
    cancelSession,
    joinOpenSession,
    joinAsThirdParticipant,
    getSession,
    subscribeToSession,
  };
}
