import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Video, VideoOff, Mic, MicOff, PhoneOff, AlertCircle, Maximize, Minimize, Timer, Settings, EyeOff, Eye, X, Ear, MessageCircle } from 'lucide-react';
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
  useInputSettings,
  useDevices,
} from '@daily-co/daily-react';
import { useSettings } from '../contexts/SettingsContext';
import { DyadRole } from '../types';

interface VideoRoomProps {
  sessionId: string;
  role: 'requester' | 'partner' | 'third';
  roomUrl: string;
  meetingToken: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
  onTimerToggle?: () => void;
  currentPhase?: DyadRole;
  leaveVideoRef?: React.MutableRefObject<(() => Promise<void>) | null>;
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
  currentPhase,
  leaveVideoRef,
}) => {
  return (
    <DailyProvider url={roomUrl} token={meetingToken}>
      <VideoUI onLeave={onLeave} onError={onError} onTimerToggle={onTimerToggle} currentPhase={currentPhase} leaveVideoRef={leaveVideoRef} />
      <DailyAudio />
    </DailyProvider>
  );
};

// ---- Innere Komponente: hat Zugriff auf Daily-Hooks ----

interface VideoUIProps {
  onLeave?: () => void;
  onError?: (error: string) => void;
  onTimerToggle?: () => void;
  currentPhase?: DyadRole;
  leaveVideoRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

const VideoUI: React.FC<VideoUIProps> = ({ onLeave, onError, onTimerToggle, currentPhase, leaveVideoRef }) => {
  const { t } = useSettings();
  const daily = useDaily();
  const meetingState = useMeetingState();
  const localSessionId = useLocalSessionId();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const { meetingError } = useDailyError();

  const containerRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hideSelf, setHideSelf] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(false);
  const [bgEffect, setBgEffect] = useState<'none' | 'blur'>('none');
  const [callError, setCallError] = useState<string | null>(null);

  // Daily.co device & input settings hooks
  const { updateInputSettings } = useInputSettings();
  const {
    cameras, microphones, speakers,
    currentCam, currentMic, currentSpeaker,
    setCamera, setMicrophone, setSpeaker,
  } = useDevices();

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

  // Register daily.leave() in ref so ActiveSession can trigger it on session end
  useEffect(() => {
    if (!leaveVideoRef || !daily) return;
    leaveVideoRef.current = () => {
      return daily.leave().catch(() => {});
    };
    return () => { leaveVideoRef.current = null; };
  }, [daily, leaveVideoRef]);

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

  const toggleNoiseCancellation = useCallback(async () => {
    const newState = !noiseCancellation;
    try {
      await updateInputSettings({
        audio: {
          processor: { type: newState ? 'noise-cancellation' : 'none' },
        },
      });
      setNoiseCancellation(newState);
    } catch (err) {
      console.warn('[VideoRoom] Noise cancellation error:', err);
    }
  }, [noiseCancellation, updateInputSettings]);

  const toggleBackgroundBlur = useCallback(async () => {
    const newEffect = bgEffect === 'blur' ? 'none' : 'blur';
    try {
      if (newEffect === 'blur') {
        await updateInputSettings({
          video: {
            processor: { type: 'background-blur', config: { strength: 0.5 } },
          },
        });
      } else {
        await updateInputSettings({
          video: {
            processor: { type: 'none' },
          },
        });
      }
      setBgEffect(newEffect);
    } catch (err) {
      console.warn('[VideoRoom] Background blur error:', err);
    }
  }, [bgEffect, updateInputSettings]);

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

  // Click-outside handler for settings panel
  useEffect(() => {
    if (!showSettings) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

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
  const allParticipantIds = localSessionId && !hideSelf
    ? [localSessionId, ...remoteParticipantIds]
    : remoteParticipantIds;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full bg-[var(--c-bg-card)] overflow-hidden transition-shadow duration-700 ${
        isFullscreen ? 'rounded-none' : 'rounded-2xl'
      } ${
        currentPhase === DyadRole.SPEAKER ? 'shadow-[inset_0_0_0_4px_rgba(249,115,22,0.5)]' :
        currentPhase === DyadRole.LISTENER ? 'shadow-[inset_0_0_0_4px_rgba(59,130,246,0.5)]' :
        ''
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

      {/* Settings Panel (overlay above controls) */}
      {showSettings && (
        <div ref={settingsPanelRef} className="absolute bottom-20 left-4 right-4 bg-[var(--c-bg-card)] rounded-2xl border border-[var(--c-border)] shadow-xl p-5 space-y-5 z-20 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--c-text-main)] uppercase tracking-widest">{t.video?.settings || 'Einstellungen'}</h4>
            <button onClick={() => setShowSettings(false)} className="p-1 rounded-lg hover:bg-[var(--c-bg-app)] transition-colors">
              <X className="w-4 h-4 text-[var(--c-text-muted)]" />
            </button>
          </div>

          {/* Kamera-Auswahl */}
          {cameras.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.camera || 'Kamera'}</label>
              <select
                value={currentCam?.device?.deviceId || ''}
                onChange={(e) => setCamera(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--c-bg-app)] text-[var(--c-text-main)] border border-[var(--c-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--c-accent)]"
              >
                {cameras.map((cam) => (
                  <option key={cam.device.deviceId} value={cam.device.deviceId}>
                    {cam.device.label || 'Kamera'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mikrofon-Auswahl */}
          {microphones.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.microphone || 'Mikrofon'}</label>
              <select
                value={currentMic?.device?.deviceId || ''}
                onChange={(e) => setMicrophone(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--c-bg-app)] text-[var(--c-text-main)] border border-[var(--c-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--c-accent)]"
              >
                {microphones.map((mic) => (
                  <option key={mic.device.deviceId} value={mic.device.deviceId}>
                    {mic.device.label || 'Mikrofon'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lautsprecher-Auswahl */}
          {speakers.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.speaker || 'Lautsprecher'}</label>
              <select
                value={currentSpeaker?.device?.deviceId || ''}
                onChange={(e) => setSpeaker(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--c-bg-app)] text-[var(--c-text-main)] border border-[var(--c-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--c-accent)]"
              >
                {speakers.map((spk) => (
                  <option key={spk.device.deviceId} value={spk.device.deviceId}>
                    {spk.device.label || 'Lautsprecher'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hintergrund-Effekte */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.background || 'Hintergrund'}</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (bgEffect !== 'none') toggleBackgroundBlur();
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  bgEffect === 'none'
                    ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                    : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
                }`}
              >
                {t.video?.bgNone || 'Keiner'}
              </button>
              <button
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  bgEffect === 'blur'
                    ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                    : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
                }`}
                onClick={() => {
                  if (bgEffect !== 'blur') toggleBackgroundBlur();
                }}
              >
                {t.video?.bgBlur || 'Blur'}
              </button>
            </div>
          </div>

          {/* Rauschunterdrueckung */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.noiseCancellation || 'Rauschunterdrueckung'}</label>
            <button
              onClick={toggleNoiseCancellation}
              className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                noiseCancellation
                  ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                  : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
              }`}
            >
              {noiseCancellation ? (t.video?.ncOn || 'Aktiv') : (t.video?.ncOff || 'Aus')}
            </button>
          </div>

          {/* Eigenes Video ausblenden */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.selfView || 'Eigenes Video'}</label>
            <button
              onClick={() => setHideSelf(!hideSelf)}
              className={`w-full py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                hideSelf
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
              }`}
            >
              {hideSelf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {hideSelf ? (t.video?.selfHidden || 'Ausgeblendet') : (t.video?.selfVisible || 'Sichtbar')}
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4 bg-[var(--c-bg-app)] border-t border-[var(--c-border)]">
        {/* Participants count */}
        <span className="text-sm text-[var(--c-text-muted)] mr-auto">
          {allParticipantIds.length} {t.video?.participants || 'Teilnehmer'}
        </span>

        {/* Phase indicator — speaker/listener */}
        {currentPhase && (
          <div
            className={`p-3 rounded-full transition-all duration-700 cursor-default ${
              currentPhase === DyadRole.SPEAKER
                ? 'bg-orange-500 text-white'
                : currentPhase === DyadRole.LISTENER
                ? 'bg-blue-500 text-white'
                : ''
            }`}
            title={currentPhase === DyadRole.SPEAKER ? 'Sprechen' : 'Zuhören'}
          >
            {currentPhase === DyadRole.SPEAKER
              ? <MessageCircle className="w-5 h-5" />
              : <Ear className="w-5 h-5" />
            }
          </div>
        )}

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

        {/* Settings toggle */}
        <button
          ref={settingsButtonRef}
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-full transition-colors ${
            showSettings
              ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
              : 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)]'
          }`}
          title={t.video?.settings || 'Einstellungen'}
        >
          <Settings className="w-5 h-5" />
        </button>

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
