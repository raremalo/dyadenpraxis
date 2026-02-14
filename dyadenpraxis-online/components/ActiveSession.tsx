import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, Play, X, Clock, User, Video, Users } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useAuth } from '../contexts/AuthContext';
import VideoRoom from './VideoRoom';
import DyadTimer from './DyadTimer';
import { fetchDyadPrompt } from '../services/geminiService';
import { useDyadTimerEngine, calcTotalSeconds } from '../hooks/useDyadTimerEngine';
import { DyadRole } from '../types';

interface ActiveSessionProps {
  onClose?: () => void;
}

const ActiveSession: React.FC<ActiveSessionProps> = ({ onClose }) => {
  const { t } = useSettings();
  const { user } = useAuth();
  const {
    currentSession,
    isInSession,
    isRequester,
    isThirdParticipant,
    startVideoSession,
    endSession,
    cancelCurrentSession,
    refreshSessions,
    isVideoReady,
    videoRoomUrl,
    videoToken,
    isLoading,
    error,
  } = useSessionContext();

  // DyadTimer Engine — lives here so timer survives overlay close
  const dyadTimer = useDyadTimerEngine();

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const leaveVideoRef = useRef<(() => void) | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showTimerOverlay, setShowTimerOverlay] = useState(false);
  const [sessionPrompt, setSessionPrompt] = useState('');
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [showEndingBanner, setShowEndingBanner] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const [showPromptOverlay, setShowPromptOverlay] = useState(false);
  const countdownHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);

  // Format remaining time as m:ss
  const formatSessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Load prompt for DyadTimer
  useEffect(() => {
    fetchDyadPrompt()
      .then((data) => setSessionPrompt(data.question))
      .catch((err) => console.error('[ActiveSession] Prompt error:', err));
  }, []);

  // Auto-close timer overlay 5s after timer starts, then show prompt 3s
  useEffect(() => {
    if (dyadTimer.timerPhase !== 'running') return;
    if (!showTimerOverlay) return;

    // Record when timer started for session countdown adjustment
    if (!timerStartedAtRef.current) {
      timerStartedAtRef.current = Date.now();
    }

    const autoCloseTimer = setTimeout(() => {
      setShowTimerOverlay(false);
      // Show prompt overlay in video area for 3 seconds
      if (sessionPrompt) {
        setShowPromptOverlay(true);
        setTimeout(() => setShowPromptOverlay(false), 3000);
      }
    }, 5000);

    return () => clearTimeout(autoCloseTimer);
  }, [dyadTimer.timerPhase, showTimerOverlay, sessionPrompt]);

  const isTriad = currentSession?.is_open && !!currentSession?.third_participant_id;

  const partner = isRequester
    ? currentSession?.partner
    : currentSession?.requester;

  const partnerInitials = partner?.name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const videoRole: 'requester' | 'partner' | 'third' = isThirdParticipant
    ? 'third'
    : isRequester
    ? 'requester'
    : 'partner';

  // Auto-show video when ready
  useEffect(() => {
    if (isVideoReady && currentSession?.status === 'active') {
      setShowVideo(true);
    }
  }, [isVideoReady, currentSession?.status]);

  // Polling-Fallback: Sessions alle 5s neu laden (auch bei aktivem Video,
  // damit Partner erkennt wenn Requester Session beendet hat)
  useEffect(() => {
    if (!currentSession) return;
    const interval = setInterval(() => {
      refreshSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSession, refreshSessions]);

  // Session-Countdown:
  // MIT Timer: Timer-Dauer + 2 min Puffer ab Timer-Start
  // OHNE Timer: gebuchte Dauer + 10 min ab session.started_at
  const handleAutoEnd = useCallback(async () => {
    console.log('[ActiveSession] Auto-End: Session-Zeit abgelaufen');
    leaveVideoRef.current?.();
    try {
      await endSession();
    } catch (err) {
      console.error('[ActiveSession] Auto-End error:', err);
    }
    onClose?.();
  }, [endSession, onClose]);

  useEffect(() => {
    if (!currentSession?.started_at || currentSession.status !== 'active' || !showVideo) return;

    // Timer bestimmt Session-Dauer; ohne Timer: gebuchte Dauer + 10 min
    const totalSeconds = dyadTimer.isTimerRunning && dyadTimer.totalTimerSeconds > 0
      ? dyadTimer.totalTimerSeconds + 120
      : (currentSession.duration + 10) * 60;
    // Timer-Start oder Session-Start als Referenz
    const startedAt = timerStartedAtRef.current || new Date(currentSession.started_at).getTime();

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = totalSeconds - elapsed;

      if (remaining <= 0) {
        clearInterval(interval);
        handleAutoEnd();
      } else {
        setSessionTimeLeft(remaining);
        setShowEndingBanner(remaining <= 60);
      }
    }, 1000);

    // Initial calculation
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = totalSeconds - elapsed;
    if (remaining > 0) {
      setSessionTimeLeft(remaining);
      setShowEndingBanner(remaining <= 60);
    }

    return () => clearInterval(interval);
  }, [currentSession?.started_at, currentSession?.status, currentSession?.duration, showVideo, handleAutoEnd, dyadTimer.isTimerRunning, dyadTimer.totalTimerSeconds]);

  // Auto-hide countdown after 3 seconds, show again on tap
  useEffect(() => {
    if (!showVideo || sessionTimeLeft === null) return;

    // Always show countdown in the last 60 seconds
    if (sessionTimeLeft <= 60) {
      setShowCountdown(true);
      return;
    }

    // On mount: show for 3s then hide
    setShowCountdown(true);
    countdownHideTimer.current = setTimeout(() => {
      setShowCountdown(false);
    }, 3000);

    return () => {
      if (countdownHideTimer.current) clearTimeout(countdownHideTimer.current);
    };
  // Only run on showVideo change (mount), not on every tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideo]);

  // Keep countdown visible in last 60 seconds
  useEffect(() => {
    if (sessionTimeLeft !== null && sessionTimeLeft <= 60) {
      setShowCountdown(true);
    }
  }, [sessionTimeLeft]);

  const handleCountdownTap = () => {
    setShowCountdown(true);
    if (countdownHideTimer.current) clearTimeout(countdownHideTimer.current);
    countdownHideTimer.current = setTimeout(() => {
      // Don't hide if in last 60 seconds
      if (sessionTimeLeft !== null && sessionTimeLeft > 60) {
        setShowCountdown(false);
      }
    }, 3000);
  };

  const handleStartSession = async () => {
    if (isRequester) {
      await startVideoSession();
    }
  };

  // Auto-end session 120s after DyadTimer completes
  useEffect(() => {
    if (dyadTimer.timerPhase !== 'completed') return;
    console.log('[ActiveSession] Timer completed — auto-end in 120s');
    const autoEndTimer = setTimeout(() => {
      handleAutoEnd();
    }, 120_000);
    return () => clearTimeout(autoEndTimer);
  }, [dyadTimer.timerPhase, handleAutoEnd]);

  const handleEndSession = async () => {
    leaveVideoRef.current?.();
    try {
      await endSession();
    } catch (err) {
      console.error('[ActiveSession] End session error:', err);
    }
    onClose?.();
  };

  const handleCancel = async () => {
    await cancelCurrentSession();
    onClose?.();
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto flex items-center justify-center">
        <div className="text-center text-[var(--c-text-muted)]">
          {t.session?.noActiveSession || 'Keine aktive Session'}
        </div>
      </div>
    );
  }

  // Waiting for partner to accept
  if (currentSession.status === 'pending') {
    return (
      <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-8">
            {partner?.avatar_url ? (
              <img
                src={partner.avatar_url}
                alt={partner.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--c-border)] flex items-center justify-center text-3xl font-serif text-[var(--c-text-muted)]">
                {partnerInitials}
              </div>
            )}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <Loader2 className="w-6 h-6 text-[var(--c-accent)] animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-serif text-[var(--c-text-main)] mb-2">
            {t.session?.waitingForPartner || 'Warte auf Partner'}
          </h2>
          <p className="text-[var(--c-text-muted)] mb-8">
            {t.session?.waitingText || 'Anfrage wurde gesendet an'} {partner?.name}
          </p>

          <div className="flex items-center gap-4 text-sm text-[var(--c-text-muted)] mb-8">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {currentSession.duration} min
            </span>
          </div>

          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-6 py-3 bg-[var(--c-bg-card)] text-[var(--c-text-main)] rounded-2xl border border-[var(--c-border)] hover:bg-[var(--c-bg-card-hover)] transition-colors"
          >
            {t.session?.cancel || 'Abbrechen'}
          </button>
        </div>
      </div>
    );
  }

  // Session accepted, ready to start
  if (currentSession.status === 'accepted' && !showVideo) {
    return (
      <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-8">
            {partner?.avatar_url ? (
              <img
                src={partner.avatar_url}
                alt={partner.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--c-border)] flex items-center justify-center text-3xl font-serif text-[var(--c-text-muted)]">
                {partnerInitials}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-400 border-2 border-[var(--c-bg-app)] rounded-full" />
          </div>

          <h2 className="text-2xl font-serif text-[var(--c-text-main)] mb-2">
            {t.session?.readyToStart || 'Bereit zum Starten'}
          </h2>
          <p className="text-[var(--c-text-muted)] mb-2">
            {partner?.name} {t.session?.hasAccepted || 'hat angenommen'}
          </p>

          <div className="flex items-center gap-4 text-sm text-[var(--c-text-muted)] mb-8">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {currentSession.duration} min
            </span>
            {isTriad && (
              <span className="flex items-center gap-1 text-[var(--c-accent)]">
                <Users className="w-4 h-4" />
                {t.triad?.label || 'Triade'}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            {isRequester ? (
              <button
                onClick={handleStartSession}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-4 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-2xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {t.session?.startSession || 'Session starten'}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-8 py-4 bg-[var(--c-bg-card)] text-[var(--c-text-muted)] rounded-2xl border border-[var(--c-border)]">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.session?.waitingForHost || 'Warte auf Host'}
              </div>
            )}

            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="p-4 bg-[var(--c-bg-card)] text-rose-500 rounded-2xl border border-[var(--c-border)] hover:bg-rose-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active session with video
  if (currentSession.status === 'active' && showVideo && videoRoomUrl && videoToken) {
    return (
      <div className="min-h-screen pt-20 pb-24 px-4 max-w-4xl mx-auto fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {partner?.avatar_url ? (
              <img
                src={partner.avatar_url}
                alt={partner.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--c-border)] flex items-center justify-center text-sm font-serif text-[var(--c-text-muted)]">
                {partnerInitials}
              </div>
            )}
            <div>
              <h3 className="font-medium text-[var(--c-text-main)]">
                {isTriad ? (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[var(--c-accent)]" />
                    {t.triad?.label || 'Triade'}
                  </span>
                ) : partner?.name}
              </h3>
              <span
                className="text-xs text-[var(--c-text-muted)] cursor-pointer"
                onClick={handleCountdownTap}
              >
                {currentSession.duration} min
                {sessionTimeLeft !== null && showCountdown && (
                  <span className={sessionTimeLeft <= 10 ? 'text-amber-400 ml-2 font-medium' : 'ml-2 opacity-60 transition-opacity'}>
                    {formatSessionTime(sessionTimeLeft)}
                  </span>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors"
          >
            {t.session?.endSession || 'Beenden'}
          </button>
        </div>

        {/* Ending Banner — last 60 seconds */}
        {showEndingBanner && sessionTimeLeft !== null && (
          <div className="mb-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center gap-2 text-amber-400/80 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Die Sitzung endet in {sessionTimeLeft} Sekunden
          </div>
        )}

        {/* Video */}
        <div className="h-[calc(100vh-200px)] min-h-[400px]">
          <VideoRoom
            sessionId={currentSession.id}
            role={videoRole}
            roomUrl={videoRoomUrl}
            meetingToken={videoToken}
            onLeave={handleEndSession}
            onTimerToggle={() => setShowTimerOverlay(true)}
            currentPhase={dyadTimer.isTimerRunning ? dyadTimer.currentRole : undefined}
            leaveVideoRef={leaveVideoRef}
          />
        </div>

        {/* Prompt Overlay — shown briefly after timer overlay auto-closes */}
        {showPromptOverlay && sessionPrompt && (
          <div className="absolute top-4 left-4 right-4 z-30 flex justify-center pointer-events-none fade-in">
            <div className="bg-black/60 backdrop-blur-sm text-white px-6 py-4 rounded-2xl max-w-md text-center">
              <p className="text-lg font-serif italic leading-relaxed">&ldquo;{sessionPrompt}&rdquo;</p>
            </div>
          </div>
        )}

        {/* DyadTimer Overlay */}
        {showTimerOverlay && sessionPrompt && (
          <DyadTimer
            onExit={() => setShowTimerOverlay(false)}
            prompt={sessionPrompt}
            sessionDuration={currentSession.duration}
            timerEngine={dyadTimer}
          />
        )}
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin" />
    </div>
  );
};

export default ActiveSession;
