import React, { useEffect, useState } from 'react';
import { Users, Clock, UserPlus, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useAuth } from '../contexts/AuthContext';
import { useCheckSessionLimit } from '../hooks/useCheckSessionLimit';

const PracticeGroups: React.FC = () => {
  const { t } = useSettings();
  const { user } = useAuth();
  const { allowed, limitInfo } = useCheckSessionLimit();
  const [limitOverlayVisible, setLimitOverlayVisible] = useState(false);
  const {
    openTriads,
    joinTriad,
    refreshTriads,
    isLoading,
    error,
  } = useSessionContext();

  useEffect(() => {
    refreshTriads();
  }, [refreshTriads]);

  const handleJoinTriad = async (sessionId: string) => {
    if (!allowed) {
      setLimitOverlayVisible(true);
      return;
    }
    await joinTriad(sessionId);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto fade-in">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif text-[var(--c-text-main)] mb-2">
              {t.triad?.title || 'Triaden'}
            </h2>
            <p className="text-[var(--c-text-muted)] font-light">
              {t.triad?.subtitle || 'Offene Gruppen-Sessions mit 3 Teilnehmern'}
            </p>
          </div>
          <button
            onClick={() => refreshTriads()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[var(--c-bg-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-rose-700 dark:text-rose-300 text-sm">{error}</span>
        </div>
      )}

      {openTriads.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-[var(--c-bg-card)] rounded-full mb-4">
            <Users className="w-8 h-8 text-[var(--c-text-muted)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--c-text-main)] mb-2">
            {t.triad?.noTriads || 'Keine offenen Triaden'}
          </h3>
          <p className="text-[var(--c-text-muted)] text-sm max-w-xs">
            {t.triad?.noTriadsDesc || 'Aktuell gibt es keine offenen Triaden. Erstelle eine Session mit der Option "Offen fuer Dritte".'}
          </p>
        </div>
      )}

      {isLoading && openTriads.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin" />
        </div>
      )}

      <div className="space-y-4">
        {openTriads.map((triad) => (
          <div
            key={triad.id}
            className="bg-[var(--c-bg-card)] p-5 rounded-2xl border border-[var(--c-border)] shadow-sm"
          >
            {/* Participants */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex -space-x-3">
                {triad.requester_avatar ? (
                  <img
                    src={triad.requester_avatar}
                    alt={triad.requester_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[var(--c-bg-card)]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--c-border)] flex items-center justify-center text-xs font-serif text-[var(--c-text-muted)] border-2 border-[var(--c-bg-card)]">
                    {getInitials(triad.requester_name)}
                  </div>
                )}
                {triad.partner_avatar ? (
                  <img
                    src={triad.partner_avatar}
                    alt={triad.partner_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[var(--c-bg-card)]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--c-border)] flex items-center justify-center text-xs font-serif text-[var(--c-text-muted)] border-2 border-[var(--c-bg-card)]">
                    {getInitials(triad.partner_name)}
                  </div>
                )}
                {/* Empty slot for third */}
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--c-accent)] flex items-center justify-center bg-[var(--c-bg-app)]">
                  <UserPlus className="w-4 h-4 text-[var(--c-accent)]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--c-text-main)] truncate">
                  {triad.requester_name} & {triad.partner_name}
                </p>
                <p className="text-xs text-[var(--c-text-muted)]">
                  {t.triad?.lookingForThird || 'Suchen 3. Teilnehmer'}
                </p>
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-[var(--c-text-muted)] mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {triad.duration} min
              </span>
              <span>Level {triad.level}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                triad.status === 'accepted'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
                {triad.status === 'accepted'
                  ? (t.triad?.waiting || 'Wartend')
                  : (t.triad?.active || 'Aktiv')
                }
              </span>
            </div>

            {/* Join button */}
            <button
              onClick={() => handleJoinTriad(triad.id)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {t.triad?.join || 'Als 3. Teilnehmer beitreten'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PracticeGroups;