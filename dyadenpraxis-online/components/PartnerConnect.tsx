import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, User, CheckCircle2, Search, X, Clock, 
  Zap, ChevronRight, Users, AlertCircle, RefreshCw 
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useAuth } from '../contexts/AuthContext';
import { usePartnerSearch, Partner } from '../hooks/usePartnerSearch';

interface PartnerConnectProps {
  onConnected: () => void;
  onCancel: () => void;
}

type Phase = 'searching' | 'selecting' | 'configuring' | 'requesting' | 'waiting';

const PartnerConnect: React.FC<PartnerConnectProps> = ({ onConnected, onCancel }) => {
  const { t } = useSettings();
  const { user, onlineUserIds } = useAuth();
  const { recommended, loadRecommended, isLoading: searchLoading } = usePartnerSearch();
  const { 
    requestSession, 
    currentSession, 
    isLoading: sessionLoading,
    error: sessionError 
  } = useSessionContext();
  const location = useLocation();

  const preselected = (location.state as { selectedPartner?: Partner })?.selectedPartner;

  const [phase, setPhase] = useState<Phase>(preselected ? 'configuring' : 'searching');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(preselected || null);
  const [sessionLevel, setSessionLevel] = useState(1);
  const [sessionDuration, setSessionDuration] = useState(40);

  // Filter online partners from recommendations
  const onlinePartners = useMemo(() => {
    return recommended.filter(p => onlineUserIds.has(p.id) && p.id !== user?.id);
  }, [recommended, onlineUserIds, user?.id]);

  // Initial load (nur wenn kein Partner vorausgewaehlt)
  useEffect(() => {
    if (preselected) return;
    loadRecommended();
    // Short delay before showing partners
    const timer = setTimeout(() => {
      setPhase('selecting');
    }, 1500);
    return () => clearTimeout(timer);
  }, [loadRecommended, preselected]);

  // Watch for session status changes
  useEffect(() => {
    if (currentSession) {
      if (currentSession.status === 'accepted' || currentSession.status === 'active') {
        onConnected();
      }
    }
  }, [currentSession, onConnected]);

  const handleSelectPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setPhase('configuring');
  };

  const handleRequestSession = async () => {
    if (!selectedPartner) return;
    
    setPhase('requesting');
    const success = await requestSession(
      selectedPartner.id,
      sessionLevel,
      sessionDuration
    );
    
    if (success) {
      setPhase('waiting');
    } else {
      setPhase('configuring');
    }
  };

  const handleRefresh = () => {
    loadRecommended();
  };

  const handleBack = () => {
    if (phase === 'configuring') {
      setSelectedPartner(null);
      setPhase('selecting');
    } else if (phase === 'waiting') {
      // Cancel would need to cancel the session
      onCancel();
    }
  };

  // Phase: Searching
  if (phase === 'searching') {
    return (
      <div className="fixed inset-0 z-40 bg-[var(--c-bg-app)]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-[var(--c-text-main)]">
        <div className="max-w-md w-full text-center space-y-8 fade-in">
          <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[var(--c-border)] animate-[ping_3s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-[var(--c-border)] animate-[ping_3s_linear_infinite_1s]" />
            <div className="bg-[var(--c-bg-card)] rounded-full p-6 shadow-xl relative z-10">
              <Search className="w-10 h-10 text-[var(--c-text-muted)]" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-serif">{t.partner?.searching || 'Suche Partner...'}</h3>
            <p className="text-[var(--c-text-muted)] font-light">
              {t.partner?.searchingSub || 'Einen Moment bitte'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Phase: Selecting Partner
  if (phase === 'selecting') {
    return (
      <div className="fixed inset-0 z-40 bg-[var(--c-bg-app)] flex flex-col p-6 pt-12 text-[var(--c-text-main)]">
        <div className="max-w-lg w-full mx-auto flex flex-col h-full fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif">{t.partner?.selectPartner || 'Partner waehlen'}</h2>
              <p className="text-[var(--c-text-muted)] text-sm mt-1">
                {onlinePartners.length} {t.partner?.onlineNow || 'online'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={searchLoading}
                className="p-2 rounded-full hover:bg-[var(--c-bg-card)] transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-[var(--c-text-muted)] ${searchLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onCancel}
                className="p-2 rounded-full hover:bg-[var(--c-bg-card)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--c-text-muted)]" />
              </button>
            </div>
          </div>

          {/* Partner List */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-24">
            {searchLoading && onlinePartners.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin" />
              </div>
            ) : onlinePartners.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-[var(--c-border)] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[var(--c-text-main)] mb-2">
                  {t.partner?.noOnline || 'Niemand online'}
                </h3>
                <p className="text-[var(--c-text-muted)] text-sm">
                  {t.partner?.tryLater || 'Versuche es spaeter noch einmal'}
                </p>
              </div>
            ) : (
              onlinePartners.map((partner) => (
                <button
                  key={partner.id}
                  onClick={() => handleSelectPartner(partner)}
                  className="w-full p-4 bg-[var(--c-bg-card)] rounded-2xl border border-[var(--c-border)] hover:border-[var(--c-accent)]/50 transition-all flex items-center gap-4 group"
                >
                  {/* Avatar */}
                  <div className="relative">
                    {partner.avatar_url ? (
                      <img
                        src={partner.avatar_url}
                        alt={partner.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[var(--c-border)] flex items-center justify-center text-lg font-serif text-[var(--c-text-muted)]">
                        {partner.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 border-2 border-[var(--c-bg-card)] rounded-full" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-[var(--c-text-main)]">{partner.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-[var(--c-text-muted)] mt-1">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Level {partner.preferred_levels?.join(', ') || '1-3'}
                      </span>
                      <span>•</span>
                      <span>{partner.sessions_completed || 0} Sessions</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-[var(--c-text-muted)] group-hover:text-[var(--c-accent)] transition-colors" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Phase: Configuring Session
  if (phase === 'configuring' && selectedPartner) {
    return (
      <div className="fixed inset-0 z-40 bg-[var(--c-bg-app)] flex flex-col items-center justify-center p-6 text-[var(--c-text-main)]">
        <div className="max-w-md w-full space-y-6 fade-in">
          {/* Partner Info */}
          <div className="text-center">
            <div className="relative inline-block mb-4">
              {selectedPartner.avatar_url ? (
                <img
                  src={selectedPartner.avatar_url}
                  alt={selectedPartner.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[var(--c-border)] flex items-center justify-center text-2xl font-serif text-[var(--c-text-muted)] mx-auto">
                  {selectedPartner.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-400 border-2 border-[var(--c-bg-app)] rounded-full" />
            </div>
            <h3 className="text-xl font-serif">{selectedPartner.name}</h3>
          </div>

          {/* Session Config */}
          <div className="bg-[var(--c-bg-card)] rounded-2xl p-6 space-y-6 border border-[var(--c-border)]">
            {/* Level Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-3">
                Level
              </label>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSessionLevel(level)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      sessionLevel === level
                        ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                        : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-3">
                <Clock className="w-4 h-4 inline mr-1" />
                Dauer
              </label>
              <div className="flex gap-2">
                {[20, 40, 60].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setSessionDuration(dur)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      sessionDuration === dur
                        ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                        : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
                    }`}
                  >
                    {dur} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {sessionError && (
            <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {sessionError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 py-4 bg-[var(--c-bg-card)] text-[var(--c-text-muted)] rounded-2xl border border-[var(--c-border)] font-medium hover:text-[var(--c-text-main)] transition-colors"
            >
              {t.partner?.back || 'Zurueck'}
            </button>
            <button
              onClick={handleRequestSession}
              disabled={sessionLoading}
              className="flex-1 py-4 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-2xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sessionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <User className="w-5 h-5" />
                  {t.partner?.sendRequest || 'Anfragen'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase: Requesting / Waiting
  if (phase === 'requesting' || phase === 'waiting') {
    return (
      <div className="fixed inset-0 z-40 bg-[var(--c-bg-app)]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-[var(--c-text-main)]">
        <div className="max-w-md w-full text-center space-y-8 fade-in">
          <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
            {selectedPartner?.avatar_url ? (
              <img
                src={selectedPartner.avatar_url}
                alt={selectedPartner.name}
                className="w-24 h-24 rounded-full object-cover relative z-10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--c-bg-card)] flex items-center justify-center text-3xl font-serif text-[var(--c-text-muted)] relative z-10">
                {selectedPartner?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="absolute inset-0 rounded-full border-2 border-[var(--c-accent)] animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-serif">
              {phase === 'requesting' 
                ? (t.partner?.sending || 'Sende Anfrage...')
                : (t.partner?.waitingFor || 'Warte auf')} {selectedPartner?.name}
            </h3>
            <p className="text-[var(--c-text-muted)] font-light">
              {phase === 'requesting'
                ? (t.partner?.pleaseWait || 'Einen Moment bitte')
                : (t.partner?.waitingText || 'Anfrage wurde gesendet')}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-[var(--c-text-muted)] mt-4">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Level {sessionLevel}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {sessionDuration} min
              </span>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text-main)] transition-colors uppercase tracking-widest"
          >
            {t.partner?.cancel || 'Abbrechen'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PartnerConnect;
