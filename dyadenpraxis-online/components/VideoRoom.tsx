import React, { useRef, useEffect, useState } from 'react';
import { Loader2, Video, VideoOff, Mic, MicOff, PhoneOff, AlertCircle } from 'lucide-react';
import { useVideoCall } from '../hooks/useVideoCall';
import { useSettings } from '../contexts/SettingsContext';

interface VideoRoomProps {
  sessionId: string;
  role: 'requester' | 'partner' | 'third';
  roomUrl?: string;
  meetingToken?: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
}

const VideoRoom: React.FC<VideoRoomProps> = ({
  sessionId,
  role,
  roomUrl: providedRoomUrl,
  meetingToken: providedToken,
  onLeave,
  onError,
}) => {
  const { t } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [roomData, setRoomData] = useState<{ roomUrl: string; token: string } | null>(
    providedRoomUrl && providedToken ? { roomUrl: providedRoomUrl, token: providedToken } : null
  );
  const [createFailed, setCreateFailed] = useState(false);

  const {
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
  } = useVideoCall({
    onLeft: onLeave,
    onError,
  });

  // Check permissions on mount
  useEffect(() => {
    checkMediaPermissions().then(setPermissionGranted);
  }, [checkMediaPermissions]);

  // Create room and get tokens
  useEffect(() => {
    if (permissionGranted && !roomData && !isLoading && !createFailed) {
      createRoom(sessionId, role === 'third').then((data) => {
        if (data) {
          const token = role === 'requester'
            ? data.tokens.requester
            : role === 'partner'
            ? data.tokens.partner
            : data.tokens.third;

          if (token) {
            setRoomData({ roomUrl: data.roomUrl, token });
          }
        } else {
          setCreateFailed(true);
        }
      });
    }
  }, [permissionGranted, roomData, isLoading, createFailed, sessionId, role, createRoom]);

  // Join call when room data is ready
  useEffect(() => {
    if (roomData && containerRef.current && !isJoined && !isLoading) {
      joinCall(roomData.roomUrl, roomData.token, containerRef.current);
    }
  }, [roomData, isJoined, isLoading, joinCall]);

  const handleLeave = () => {
    leaveCall();
    onLeave?.();
  };

  // Permission check screen
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
          onClick={() => checkMediaPermissions().then(setPermissionGranted)}
          className="mt-4 px-4 py-2 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-xl text-sm font-medium"
        >
          {t.video?.retry || 'Erneut versuchen'}
        </button>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">{t.video?.error || 'Fehler'}</h3>
        <p className="text-[var(--c-text-muted)] text-center text-sm max-w-xs">{error}</p>
        <button
          onClick={handleLeave}
          className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium"
        >
          {t.video?.close || 'Schliessen'}
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading || !isJoined) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin mb-4" />
        <p className="text-[var(--c-text-muted)]">{t.video?.connecting || 'Verbinde...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--c-bg-card)] rounded-2xl overflow-hidden">
      {/* Video Container */}
      <div ref={containerRef} className="flex-1 min-h-0" />

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-[var(--c-bg-app)] border-t border-[var(--c-border)]">
        {/* Participants count */}
        <span className="text-sm text-[var(--c-text-muted)] mr-auto">
          {participants.length} {t.video?.participants || 'Teilnehmer'}
        </span>

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
