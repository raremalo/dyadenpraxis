import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Session, OpenTriad, useSession } from '../hooks/useSession';
import { useVideoCall } from '../hooks/useVideoCall';

interface SessionContextType {
  // Session State
  currentSession: Session | null;
  isInSession: boolean;
  isRequester: boolean;
  isThirdParticipant: boolean;
  openTriads: OpenTriad[];

  // Session Actions
  requestSession: (partnerId: string, level: number, duration: number, isOpen?: boolean) => Promise<boolean>;
  acceptInvite: (sessionId: string) => Promise<boolean>;
  startVideoSession: () => Promise<boolean>;
  endSession: () => Promise<void>;
  cancelCurrentSession: () => Promise<void>;
  joinTriad: (sessionId: string) => Promise<boolean>;
  refreshTriads: () => Promise<void>;
  refreshSessions: () => Promise<void>;

  // Video State
  isVideoReady: boolean;
  videoRoomUrl: string | null;
  videoToken: string | null;

  // Loading/Error
  isLoading: boolean;
  error: string | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const {
    activeSession,
    openTriads,
    createSession,
    acceptSession,
    startSession,
    startTriadSession,
    completeSession,
    cancelSession,
    joinAsThirdParticipant,
    subscribeToSession,
    loadSessions,
    loadOpenTriads,
    isLoading: sessionLoading,
    error: sessionError,
  } = useSession();

  const { createRoom, isLoading: videoLoading } = useVideoCall();

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [videoRoomUrl, setVideoRoomUrl] = useState<string | null>(null);
  const [videoToken, setVideoToken] = useState<string | null>(null);

  const isInSession = !!currentSession && ['accepted', 'active'].includes(currentSession.status);
  const isRequester = currentSession?.requester_id === user?.id;
  const isThirdParticipant = currentSession?.third_participant_id === user?.id;

  // Sync with activeSession from hook
  useEffect(() => {
    if (activeSession) {
      setCurrentSession(activeSession);
      if (activeSession.room_url) {
        setVideoRoomUrl(activeSession.room_url);
        // Direkte Prüfung statt isRequester/isThirdParticipant (verhindert stale closure)
        const isReq = activeSession.requester_id === user?.id;
        const isThird = activeSession.third_participant_id === user?.id;
        if (isThird) {
          setVideoToken(activeSession.third_participant_token);
        } else if (isReq) {
          setVideoToken(activeSession.room_token);
        } else {
          setVideoToken(activeSession.partner_token);
        }
      }
    } else {
      setCurrentSession(null);
      setVideoRoomUrl(null);
      setVideoToken(null);
    }
  }, [activeSession, user?.id]);

  // Subscribe to session changes
  useEffect(() => {
    if (currentSession?.id) {
      const unsubscribe = subscribeToSession(currentSession.id, (updated) => {
        setCurrentSession(updated);
        if (updated.status === 'completed' || updated.status === 'cancelled') {
          setCurrentSession(null);
          setVideoRoomUrl(null);
          setVideoToken(null);
        }
      });
      return unsubscribe;
    }
  }, [currentSession?.id, subscribeToSession]);

  const requestSession = useCallback(async (
    partnerId: string,
    level: number,
    duration: number,
    isOpen = false
  ): Promise<boolean> => {
    const session = await createSession({ partnerId, level, duration, isOpen });
    if (session) {
      setCurrentSession(session);
      return true;
    }
    return false;
  }, [createSession]);

  const acceptInvite = useCallback(async (sessionId: string): Promise<boolean> => {
    const success = await acceptSession(sessionId);
    if (success) {
      await loadSessions();
    }
    return success;
  }, [acceptSession, loadSessions]);

  const startVideoSession = useCallback(async (): Promise<boolean> => {
    if (!currentSession || !isRequester) return false;

    const isTriad = currentSession.is_open && !!currentSession.third_participant_id;
    const roomData = await createRoom(currentSession.id, isTriad);
    if (!roomData) return false;

    let success: boolean;
    if (isTriad && roomData.tokens.third) {
      success = await startTriadSession(
        currentSession.id,
        roomData.roomUrl,
        roomData.tokens.requester,
        roomData.tokens.partner,
        roomData.tokens.third
      );
    } else {
      success = await startSession(
        currentSession.id,
        roomData.roomUrl,
        roomData.tokens.requester,
        roomData.tokens.partner
      );
    }

    if (success) {
      setVideoRoomUrl(roomData.roomUrl);
      setVideoToken(roomData.tokens.requester);
    }

    return success;
  }, [currentSession, isRequester, createRoom, startSession, startTriadSession]);

  const endSession = useCallback(async () => {
    if (!currentSession) return;
    const success = await completeSession(currentSession.id);
    if (!success) {
      console.error('[SessionContext] endSession: completeSession failed for', currentSession.id);
    }
    // Always clear state — user wants to leave regardless of DB result
    setCurrentSession(null);
    setVideoRoomUrl(null);
    setVideoToken(null);
  }, [currentSession, completeSession]);

  const cancelCurrentSession = useCallback(async () => {
    if (!currentSession) return;
    await cancelSession(currentSession.id);
    setCurrentSession(null);
    setVideoRoomUrl(null);
    setVideoToken(null);
  }, [currentSession, cancelSession]);

  const joinTriad = useCallback(async (sessionId: string): Promise<boolean> => {
    const success = await joinAsThirdParticipant(sessionId);
    if (success) {
      await loadSessions();
    }
    return success;
  }, [joinAsThirdParticipant, loadSessions]);

  const refreshTriads = useCallback(async () => {
    await loadOpenTriads();
  }, [loadOpenTriads]);

  const refreshSessions = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

  return (
    <SessionContext.Provider value={{
      currentSession,
      isInSession,
      isRequester,
      isThirdParticipant,
      openTriads,
      requestSession,
      acceptInvite,
      startVideoSession,
      endSession,
      cancelCurrentSession,
      joinTriad,
      refreshTriads,
      refreshSessions,
      isVideoReady: !!videoRoomUrl && !!videoToken,
      videoRoomUrl,
      videoToken,
      isLoading: sessionLoading || videoLoading,
      error: sessionError,
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
};
