import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Video, VideoOff, Mic, MicOff, PhoneOff, AlertCircle, Maximize, Minimize, Timer } from 'lucide-react';
import {
  DailyProvider,
  DailyAudio,
  DailyVideo,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useMeetingState,
  useDailyEvent,
  useDailyError,
} from '@daily-co/daily-react';
import { useSettings } from '../contexts/SettingsContext';

interface VideoRoomProps {
  sessionId: string;
  role: 'requester' | 'partner' | 'third';
  roomUrl: string;
  meetingToken: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
  onTimerToggle?: () => void;
}

/**
 * VideoRoom: Wrapper mit DailyProvider.
 * roomUrl und meetingToken kommen aus SessionContext (via ActiveSession Props).
 * KEIN createRoom() — Room wurde bereits in SessionContext.startVideoSession() erstellt.
 */
const VideoRoom: React.FC<VideoRoomProps> = ({
  roomUrl,
  meetingToken,
  onLeave,
  onError,
  onTimerToggle,
}) => {
  return (
    <DailyProvider url={roomUrl} token={meetingToken}>
      <VideoUI onLeave={onLeave} onError={onError} onTimerToggle={onTimerToggle} />
      <DailyAudio />
    </DailyProvider>
  );
};

// ---- Innere Komponente: hat Zugriff auf Daily-Hooks ----

interface VideoUIProps {
  onLeave?: () => void;
  onError?: (error: string) => void;
  onTimerToggle?: () => void;
}

const VideoUI: React.FC<VideoUIProps> = ({ onLeave, onError, onTimerToggle }) => {
  const { t } = useSettings();
  const daily = useDaily();
  const meetingState = useMeetingState();
  const localSessionId = useLocalSessionId();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const { meetingError } = useDailyError();

  const containerRef = useRef<HTMLDivElement>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // Check media permissions before joining
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setPermissionGranted(true);
      })
      .catch(() => setPermissionGranted(false));
  }, []);

  // Auto-join when permissions granted and daily is ready
  useEffect(() => {
    if (permissionGranted && daily && meetingState === 'new') {
      daily.join().catch((err) => {
        const msg = err instanceof Error ? err.message : 'Beitritt fehlgeschlagen';
        setCallError(msg);
        onError?.(msg);
      });
    }
  }, [permissionGranted, daily, meetingState, onError]);

  // Handle meeting errors
  useEffect(() => {
    if (meetingError) {
      const msg = meetingError.errorMsg || 'Video-Call Fehler';
      setCallError(msg);
      onError?.(msg);
    }
  }, [meetingError, onError]);

  // Handle left-meeting event
  const handleLeftMeeting = useCallback(() => {
    onLeave?.();
  }, [onLeave]);

  useDailyEvent('left-meeting', handleLeftMeeting);

  // Handle fatal error event
  const handleError = useCallback((ev: { errorMsg?: string }) => {
    const msg = ev?.errorMsg || 'Video-Call Fehler';
    setCallError(msg);
    onError?.(msg);
  }, [onError]);

  useDailyEvent('error', handleError);

  const handleLeave = useCallback(() => {
    daily?.leave();
    onLeave?.();
  }, [daily, onLeave]);

  const toggleAudio = useCallback(() => {
    if (daily) {
      const newState = !isAudioEnabled;
      daily.setLocalAudio(newState);
      setIsAudioEnabled(newState);
    }
  }, [daily, isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (daily) {
      const newState = !isVideoEnabled;
      daily.setLocalVideo(newState);
      setIsVideoEnabled(newState);
    }
  }, [daily, isVideoEnabled]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('[VideoRoom] Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes (also triggered by Escape key)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Permission checking
  if (permissionGranted === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin mb-4" />
        <p className="text-[var(--c-text-muted)]">{t.video?.checkingPermissions || 'Berechtigungen pruefen...'}</p>
      </div>
    );
  }

  // Permission denied
  if (permissionGranted === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">{t.video?.permissionDenied || 'Zugriff verweigert'}</h3>
        <p className="text-[var(--c-text-muted)] text-center text-sm max-w-xs">
          {t.video?.permissionDeniedText || 'Bitte erlaube den Zugriff auf Kamera und Mikrofon in deinen Browser-Einstellungen.'}
        </p>
        <button
          onClick={() => {
            navigator.mediaDevices
              .getUserMedia({ audio: true, video: true })
              .then((stream) => {
                stream.getTracks().forEach((t) => t.stop());
                setPermissionGranted(true);
              })
              .catch(() => setPermissionGranted(false));
          }}
          className="mt-4 px-4 py-2 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-xl text-sm font-medium"
        >
          {t.video?.retry || 'Erneut versuchen'}
        </button>
      </div>
    );
  }

  // Error state
  if (callError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">{t.video?.error || 'Fehler'}</h3>
        <p className="text-[var(--c-text-muted)] text-center text-sm max-w-xs">{callError}</p>
        <button
          onClick={handleLeave}
          className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium"
        >
          {t.video?.close || 'Schliessen'}
        </button>
      </div>
    );
  }

  // Loading / connecting
  if (meetingState !== 'joined-meeting') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin mb-4" />
        <p className="text-[var(--c-text-muted)]">{t.video?.connecting || 'Verbinde...'}</p>
      </div>
    );
  }

  // Joined — show video tiles
  const allParticipantIds = localSessionId
    ? [localSessionId, ...remoteParticipantIds]
    : remoteParticipantIds;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-[var(--c-bg-card)] overflow-hidden ${
        isFullscreen ? 'rounded-none' : 'rounded-2xl'
      }`}
    >
      {/* Video Grid */}
      <div className={`flex-1 min-h-0 grid gap-2 p-2 ${
        allParticipantIds.length <= 1 ? 'grid-cols-1' :
        allParticipantIds.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
        'grid-cols-2'
      }`}>
        {allParticipantIds.map((id) => (
          <div key={id} className="relative rounded-xl overflow-hidden bg-black">
            <DailyVideo
              sessionId={id}
              type="video"
              automirror
              fit="cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {id === localSessionId && (
              <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                Du
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4 bg-[var(--c-bg-app)] border-t border-[var(--c-border)]">
        {/* Participants count */}
        <span className="text-sm text-[var(--c-text-muted)] mr-auto">
          {allParticipantIds.length} {t.video?.participants || 'Teilnehmer'}
        </span>

        {/* Timer/Gong toggle */}
        {onTimerToggle && (
          <button
            onClick={onTimerToggle}
            className="p-3 rounded-full bg-[var(--c-accent)]/15 text-[var(--c-accent)] hover:bg-[var(--c-accent)]/25 transition-colors"
            title={t.timer?.label || 'Intervall-Gong'}
          >
            <Timer className="w-5 h-5" />
          </button>
        )}

        {/* Audio toggle */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioEnabled
              ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)]'
              : 'bg-rose-500 text-white'
          }`}
          title={isAudioEnabled ? (t.video?.muteAudio || 'Stummschalten') : (t.video?.unmuteAudio || 'Ton aktivieren')}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Video toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            isVideoEnabled
              ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)]'
              : 'bg-rose-500 text-white'
          }`}
          title={isVideoEnabled ? (t.video?.disableVideo || 'Video deaktivieren') : (t.video?.enableVideo || 'Video aktivieren')}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-full bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)] transition-colors"
          title={isFullscreen ? (t.video?.exitFullscreen || 'Vollbild beenden') : (t.video?.fullscreen || 'Vollbild')}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>

        {/* Leave call */}
        <button
          onClick={handleLeave}
          className="p-3 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-colors ml-auto"
          title={t.video?.leave || 'Verlassen'}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default VideoRoom;
