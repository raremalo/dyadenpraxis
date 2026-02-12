import { useState, useRef, useCallback, useEffect } from 'react';
import DailyIframe, { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import { supabase } from '../lib/supabase';

interface RoomTokens {
  requester: string;
  partner: string;
  third: string | null;
}

interface CreateRoomResponse {
  roomUrl: string;
  tokens: RoomTokens;
}

interface UseVideoCallOptions {
  onJoined?: () => void;
  onLeft?: () => void;
  onParticipantJoined?: (participant: DailyParticipant) => void;
  onParticipantLeft?: (participant: DailyParticipant) => void;
  onError?: (error: string) => void;
}

interface UseVideoCallReturn {
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;
  participants: DailyParticipant[];
  createRoom: (sessionId: string, includeThird?: boolean) => Promise<CreateRoomResponse | null>;
  joinCall: (roomUrl: string, meetingToken: string, container: HTMLElement) => Promise<void>;
  leaveCall: () => void;
  checkMediaPermissions: () => Promise<boolean>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

export function useVideoCall(options: UseVideoCallOptions = {}): UseVideoCallReturn {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const callFrameRef = useRef<DailyCall | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, []);

  const updateParticipants = useCallback(() => {
    if (callFrameRef.current) {
      const allParticipants = callFrameRef.current.participants();
      setParticipants(Object.values(allParticipants));
    }
  }, []);

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
        // Bei 401: Session ungültig → automatisch ausloggen
        const status = (fnError as { context?: { status?: number } }).context?.status;
        if (status === 401) {
          console.error('[VideoCall] Auth fehlgeschlagen (401), Session wird beendet');
          await supabase.auth.signOut();
          const authMsg = 'Sitzung abgelaufen. Bitte erneut anmelden.';
          setError(authMsg);
          optionsRef.current.onError?.(authMsg);
          return null;
        }
        throw new Error(fnError.message || 'Room-Erstellung fehlgeschlagen');
      }

      return data as CreateRoomResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Room-Erstellung fehlgeschlagen';
      setError(msg);
      optionsRef.current.onError?.(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinCall = useCallback(async (
    roomUrl: string,
    meetingToken: string,
    container: HTMLElement
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Destroy existing frame if any
      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
      }

      callFrameRef.current = DailyIframe.createFrame(container, {
        showLeaveButton: true,
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '12px',
        },
      });

      callFrameRef.current.on('joined-meeting', () => {
        setIsJoined(true);
        updateParticipants();
        optionsRef.current.onJoined?.();
      });

      callFrameRef.current.on('left-meeting', () => {
        setIsJoined(false);
        setParticipants([]);
        optionsRef.current.onLeft?.();
      });

      callFrameRef.current.on('participant-joined', (event) => {
        updateParticipants();
        if (event?.participant) {
          optionsRef.current.onParticipantJoined?.(event.participant);
        }
      });

      callFrameRef.current.on('participant-left', (event) => {
        updateParticipants();
        if (event?.participant) {
          optionsRef.current.onParticipantLeft?.(event.participant);
        }
      });

      callFrameRef.current.on('error', (event) => {
        const msg = event?.errorMsg || 'Video-Call Fehler';
        setError(msg);
        optionsRef.current.onError?.(msg);
      });

      await callFrameRef.current.join({ url: roomUrl, token: meetingToken });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Beitritt fehlgeschlagen';
      setError(msg);
      optionsRef.current.onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  }, [updateParticipants]);

  const leaveCall = useCallback(() => {
    if (callFrameRef.current) {
      callFrameRef.current.leave();
      callFrameRef.current.destroy();
      callFrameRef.current = null;
    }
    setIsJoined(false);
    setParticipants([]);
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

  const toggleAudio = useCallback(() => {
    if (callFrameRef.current) {
      const newState = !isAudioEnabled;
      callFrameRef.current.setLocalAudio(newState);
      setIsAudioEnabled(newState);
    }
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (callFrameRef.current) {
      const newState = !isVideoEnabled;
      callFrameRef.current.setLocalVideo(newState);
      setIsVideoEnabled(newState);
    }
  }, [isVideoEnabled]);

  return {
    isJoined,
    isLoading,
    error,
    participants,
    createRoom,
    joinCall,
    leaveCall,
    checkMediaPermissions,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
  };
}
