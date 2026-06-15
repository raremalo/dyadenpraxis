import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, EyeOff } from 'lucide-react';
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
  useAppMessage,
  useNetwork,
} from '@daily-co/daily-react';
import { useSettings } from '../contexts/SettingsContext';
import { Wifi, WifiOff } from 'lucide-react';
import { DyadRole } from '../types';
import VideoStatusScreens from './VideoRoom/VideoStatusScreens';
import VideoSettingsPanel from './VideoRoom/VideoSettingsPanel';
import VideoControls from './VideoRoom/VideoControls';

interface VideoRoomProps {
  sessionId: string;
  role: 'requester' | 'partner' | 'third';
  roomUrl: string;
  meetingToken: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
  onTimerToggle?: () => void;
  currentPhase?: DyadRole;
  phaseSoundUrl?: string;
  sessionTimeLeft?: number | null;
  onRemoteSessionEnding?: (secondsLeft: number) => void;
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
  phaseSoundUrl,
  sessionTimeLeft,
  onRemoteSessionEnding,
  leaveVideoRef,
}) => {
  return (
    <DailyProvider url={roomUrl} token={meetingToken}>
      <VideoUI onLeave={onLeave} onError={onError} onTimerToggle={onTimerToggle} currentPhase={currentPhase} phaseSoundUrl={phaseSoundUrl} sessionTimeLeft={sessionTimeLeft} onRemoteSessionEnding={onRemoteSessionEnding} leaveVideoRef={leaveVideoRef} />
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
  phaseSoundUrl?: string;
  sessionTimeLeft?: number | null;
  onRemoteSessionEnding?: (secondsLeft: number) => void;
  leaveVideoRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

const VideoUI: React.FC<VideoUIProps> = ({ onLeave, onError, onTimerToggle, currentPhase, phaseSoundUrl, sessionTimeLeft, onRemoteSessionEnding, leaveVideoRef }) => {
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

  // --- Phase + Gong sync via AppMessage ---
  const [remotePhase, setRemotePhase] = useState<DyadRole | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const playRemoteGong = useCallback((soundUrl: string) => {
    if (!remoteAudioRef.current || remoteAudioRef.current.src !== soundUrl) {
      remoteAudioRef.current = new Audio(soundUrl);
    }
    remoteAudioRef.current.currentTime = 0;
    remoteAudioRef.current.play().catch(e => console.log('[VideoUI] Remote gong blocked:', e));
  }, []);

  const sendAppMessage = useAppMessage({
    onAppMessage: useCallback((ev: { data: { type: string; role?: string; soundUrl?: string; secondsLeft?: number } }) => {
      if (ev.data?.type === 'phase') {
        const role = ev.data.role as DyadRole;
        // Spiegeln: Partner sieht die umgekehrte Rolle
        if (role === DyadRole.SPEAKER) setRemotePhase(DyadRole.LISTENER);
        else if (role === DyadRole.LISTENER) setRemotePhase(DyadRole.SPEAKER);
        else setRemotePhase(role); // CONTEMPLATION, TRANSITION, COMPLETED unverändert
        // Gong abspielen bei Phasenwechsel
        if (ev.data.soundUrl) {
          playRemoteGong(ev.data.soundUrl);
        }
      } else if (ev.data?.type === 'phase-stop') {
        setRemotePhase(null);
      } else if (ev.data?.type === 'session-ending' && typeof ev.data.secondsLeft === 'number') {
        onRemoteSessionEnding?.(ev.data.secondsLeft);
      }
    }, [playRemoteGong, onRemoteSessionEnding]),
  });

  // Sende Phase wenn sich currentPhase ändert (nur Timer-Starter hat currentPhase)
  useEffect(() => {
    if (!daily || meetingState !== 'joined-meeting') return;
    if (currentPhase) {
      sendAppMessage({ type: 'phase', role: currentPhase, soundUrl: phaseSoundUrl || '' }, '*');
    } else {
      sendAppMessage({ type: 'phase-stop' }, '*');
    }
  }, [currentPhase, phaseSoundUrl, daily, meetingState, sendAppMessage]);

  // Sende session-ending Countdown zum Partner (letzte 60 Sekunden)
  useEffect(() => {
    if (!daily || meetingState !== 'joined-meeting') return;
    if (sessionTimeLeft !== null && sessionTimeLeft !== undefined && sessionTimeLeft <= 60 && sessionTimeLeft > 0) {
      sendAppMessage({ type: 'session-ending', secondsLeft: sessionTimeLeft }, '*');
    }
  }, [sessionTimeLeft, daily, meetingState, sendAppMessage]);

  // Cleanup remote audio on unmount
  useEffect(() => {
    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current = null;
      }
    };
  }, []);

  // Lokale Phase (Timer-Starter) oder Remote-Phase (Partner)
  const effectivePhase = currentPhase || remotePhase;
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hideSelf, setHideSelf] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(false);
  const [bgEffect, setBgEffect] = useState<'none' | 'blur'>('none');
  const [callError, setCallError] = useState<string | null>(null);

  // Netzwerkqualitaet
  const { networkState } = useNetwork();

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

  // Retry: Berechtigungen erneut anfordern (fuer permission-denied Screen)
  const retryPermissions = useCallback(() => {
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
    return <VideoStatusScreens status="checking" onRetry={retryPermissions} onLeave={handleLeave} />;
  }

  // Permission denied
  if (permissionGranted === false) {
    return <VideoStatusScreens status="denied" onRetry={retryPermissions} onLeave={handleLeave} />;
  }

  // Error state
  if (callError) {
    return <VideoStatusScreens status="error" errorMessage={callError} onRetry={retryPermissions} onLeave={handleLeave} />;
  }

  // Loading / connecting
  if (meetingState !== 'joined-meeting') {
    return <VideoStatusScreens status="connecting" onRetry={retryPermissions} onLeave={handleLeave} />;
  }

  // Joined — PIP layout: remote video fullscreen, self-view as small overlay
  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full bg-[var(--c-bg-card)] overflow-hidden transition-shadow duration-700 ${
        isFullscreen ? 'rounded-none' : 'rounded-2xl'
      } ${
        effectivePhase === DyadRole.SPEAKER ? 'shadow-[inset_0_0_0_4px_rgba(249,115,22,0.5)]' :
        effectivePhase === DyadRole.LISTENER ? 'shadow-[inset_0_0_0_4px_rgba(59,130,246,0.5)]' :
        ''
      }`}
    >
        {/* Netzwerk-Indikator — dezent oben links, nur bei Problemen */}
        {(networkState === 'warning' || networkState === 'bad') && (
          <div
            className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all duration-500 ${
              networkState === 'bad'
                ? 'bg-rose-500/80 text-white'
                : 'bg-amber-500/80 text-white'
            }`}
          >
            {networkState === 'bad' ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{networkState === 'bad' ? 'Schlechte Verbindung' : 'Instabile Verbindung'}</span>
          </div>
        )}

      {/* Partner Video — full area */}
      <div className="flex-1 min-h-0 relative">
        {remoteParticipantIds.length > 0 ? (
          <div className="absolute inset-0 rounded-xl overflow-hidden bg-black m-2">
            {remoteParticipantIds.map((id) => (
              <DailyVideo
                key={id}
                sessionId={id}
                type="video"
                automirror
                fit="cover"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center m-2 rounded-xl bg-black/80">
            <div className="text-center text-white/60">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">{t.video?.waitingForPartner || 'Warte auf Partner...'}</p>
            </div>
          </div>
        )}

        {/* Self-View PIP — small overlay bottom-right */}
        {localSessionId && !hideSelf && (
          <button
            onClick={() => setHideSelf(true)}
            className="absolute bottom-4 right-4 w-28 h-36 md:w-36 md:h-48 rounded-xl overflow-hidden bg-black border-2 border-white/20 shadow-lg z-10 cursor-pointer group transition-transform hover:scale-105"
            title={t.video?.hideSelf || 'Eigenes Video ausblenden'}
          >
            <DailyVideo
              sessionId={localSessionId}
              type="video"
              automirror
              fit="cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">
              Du
            </span>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        )}
      </div>

      {/* Settings Panel (overlay above controls) */}
      {showSettings && (
        <VideoSettingsPanel
          panelRef={settingsPanelRef}
          cameras={cameras}
          microphones={microphones}
          speakers={speakers}
          currentCam={currentCam}
          currentMic={currentMic}
          currentSpeaker={currentSpeaker}
          setCamera={setCamera}
          setMicrophone={setMicrophone}
          setSpeaker={setSpeaker}
          bgEffect={bgEffect}
          onToggleBackgroundBlur={toggleBackgroundBlur}
          noiseCancellation={noiseCancellation}
          onToggleNoiseCancellation={toggleNoiseCancellation}
          onClose={() => setShowSettings(false)}
        />
      )}

      <VideoControls
        participantCount={remoteParticipantIds.length + (localSessionId ? 1 : 0)}
        effectivePhase={effectivePhase}
        onTimerToggle={onTimerToggle}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        settingsButtonRef={settingsButtonRef}
        hideSelf={hideSelf}
        onToggleHideSelf={() => setHideSelf(!hideSelf)}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={toggleAudio}
        isVideoEnabled={isVideoEnabled}
        onToggleVideo={toggleVideo}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onLeave={handleLeave}
      />
    </div>
  );
};

export default VideoRoom;
