import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface RoomTokens {
  requester: string;
  partner: string;
  third: string | null;
}

export interface CreateRoomResponse {
  roomUrl: string;
  tokens: RoomTokens;
}

interface UseVideoCallReturn {
  isLoading: boolean;
  error: string | null;
  createRoom: (sessionId: string, includeThird?: boolean) => Promise<CreateRoomResponse | null>;
  checkMediaPermissions: () => Promise<boolean>;
}

/**
 * Reduzierter Hook: Nur noch createRoom (fuer SessionContext) und checkMediaPermissions.
 * Video-Joining, Participants, Audio/Video-Toggle werden jetzt von daily-react Hooks
 * direkt in VideoRoom.tsx gehandhabt.
 */
export function useVideoCall(): UseVideoCallReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invokeCreateRoom = useCallback(async (
    sessionId: string,
    includeThird: boolean
  ): Promise<{ data: CreateRoomResponse | null; status?: number; errorMsg?: string }> => {
    const { data, error: fnError } = await supabase.functions.invoke('create-room', {
      body: { sessionId, includeThird },
    });

    if (fnError) {
      const status = (fnError as { context?: { status?: number } }).context?.status;
      return { data: null, status, errorMsg: fnError.message };
    }

    return { data: data as CreateRoomResponse };
  }, []);

  const createRoom = useCallback(async (
    sessionId: string,
    includeThird = false
  ): Promise<CreateRoomResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Erster Versuch
      let result = await invokeCreateRoom(sessionId, includeThird);

      // Bei 401: Token refreshen und automatisch nochmal versuchen
      if (result.status === 401) {
        console.warn('[VideoCall] Auth 401 — versuche Token-Refresh + Retry');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('[VideoCall] Token-Refresh fehlgeschlagen:', refreshError.message);
          setError('Sitzung abgelaufen. Bitte Seite neu laden.');
          return null;
        }
        // Retry mit neuem Token
        result = await invokeCreateRoom(sessionId, includeThird);
      }

      if (result.status === 401) {
        setError('Sitzung abgelaufen. Bitte Seite neu laden.');
        return null;
      }
      if (result.status === 403) {
        console.error('[VideoCall] Nicht berechtigt (403):', result.errorMsg);
        setError('Nur der Anfragende kann die Session starten.');
        return null;
      }
      if (!result.data) {
        throw new Error(result.errorMsg || 'Room-Erstellung fehlgeschlagen');
      }

      return result.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Room-Erstellung fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [invokeCreateRoom]);

  const checkMediaPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    isLoading,
    error,
    createRoom,
    checkMediaPermissions,
  };
}
