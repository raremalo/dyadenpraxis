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

  const createRoom = useCallback(async (
    sessionId: string,
    includeThird = false
  ): Promise<CreateRoomResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-room', {
        body: { sessionId, includeThird },
      });

      if (fnError) {
        // Bei 401: Session ungueltig → automatisch ausloggen
        const status = (fnError as { context?: { status?: number } }).context?.status;
        if (status === 401) {
          console.error('[VideoCall] Auth fehlgeschlagen (401), Session wird beendet');
          await supabase.auth.signOut();
          const authMsg = 'Sitzung abgelaufen. Bitte erneut anmelden.';
          setError(authMsg);
          return null;
        }
        throw new Error(fnError.message || 'Room-Erstellung fehlgeschlagen');
      }

      return data as CreateRoomResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Room-Erstellung fehlgeschlagen';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
