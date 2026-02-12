import React, { useRef, useEffect, useState } from 'react';
import { Loader2, Play, X, Clock, User, Video, Users } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useAuth } from '../contexts/AuthContext';
import VideoRoom from './VideoRoom';
import DyadTimer from './DyadTimer';
import { fetchDyadPrompt } from '../services/geminiService';

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
    isVideoReady,
    videoRoomUrl,
    videoToken,
    isLoading,
    error,
  } = useSessionContext();

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [sessionPrompt, setSessionPrompt] = useState('');

  // Load prompt for DyadTimer
  useEffect(() => {
    fetchDyadPrompt()
      .then((data) => setSessionPrompt(data.question))
      .catch((err) => console.error('[ActiveSession] Prompt error:', err));
  }, []);

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

  const handleStartSession = async () => {
    if (isRequester) {
      await startVideoSession();
    }
  };

  const handleEndSession = async () => {
    await endSession();
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
            <span>Level {currentSession.level}</span>
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
            <span>Level {currentSession.level}</span>
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
              <span className="text-xs text-[var(--c-text-muted)]">
                Level {currentSession.level} • {currentSession.duration} min
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

        {/* Video */}
        <div className="h-[calc(100vh-200px)] min-h-[400px]">
          <VideoRoom
            sessionId={currentSession.id}
            role={videoRole}
            roomUrl={videoRoomUrl}
            meetingToken={videoToken}
            onLeave={handleEndSession}
            onTimerToggle={() => setShowTimer(true)}
          />
        </div>

        {/* DyadTimer Overlay */}
        {showTimer && sessionPrompt && (
          <DyadTimer
            onExit={() => setShowTimer(false)}
            prompt={sessionPrompt}
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
