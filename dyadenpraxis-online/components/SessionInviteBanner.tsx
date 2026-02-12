import React, { useEffect, useState } from 'react';
import { X, Check, Clock, Zap, User } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useSessionContext } from '../contexts/SessionContext';
import { useAuth } from '../contexts/AuthContext';
import { useSession, Session } from '../hooks/useSession';

interface SessionInviteBannerProps {
  onAccepted?: () => void;
}

/**
 * Banner das eingehende Session-Einladungen anzeigt.
 * Wird global in App.tsx eingebunden und zeigt Einladungen
 * wo der aktuelle User als Partner eingetragen ist.
 */
const SessionInviteBanner: React.FC<SessionInviteBannerProps> = ({ onAccepted }) => {
  const { t } = useSettings();
  const { user } = useAuth();
  const { sessions, loadSessions } = useSession();
  const { acceptInvite, cancelCurrentSession, isLoading } = useSessionContext();
  
  const [pendingInvite, setPendingInvite] = useState<Session | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Find pending sessions where current user is the partner (incoming invite)
  useEffect(() => {
    if (!user || isDismissed) return;
    
    const invite = sessions.find(
      s => s.status === 'pending' && s.partner_id === user.id
    );
    
    setPendingInvite(invite || null);
  }, [sessions, user, isDismissed]);

  // Poll for new invites every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loadSessions]);

  const handleAccept = async () => {
    if (!pendingInvite) return;
    
    const success = await acceptInvite(pendingInvite.id);
    if (success) {
      setPendingInvite(null);
      onAccepted?.();
    }
  };

  const handleDecline = async () => {
    if (!pendingInvite) return;
    
    // We need to cancel the session from the partner side
    // This requires the cancelSession function
    setIsDismissed(true);
    setPendingInvite(null);
  };

  if (!pendingInvite) {
    return null;
  }

  const requester = pendingInvite.requester;
  const initials = requester?.name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className="max-w-md mx-auto bg-[var(--c-bg-card)] rounded-2xl shadow-xl border border-[var(--c-accent)]/30 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[var(--c-accent)]/10 px-4 py-2 flex items-center gap-2">
          <User className="w-4 h-4 text-[var(--c-accent)]" />
          <span className="text-sm font-medium text-[var(--c-accent)]">
            {t.session?.incomingRequest || 'Eingehende Anfrage'}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {requester?.avatar_url ? (
                <img
                  src={requester.avatar_url}
                  alt={requester.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[var(--c-border)] flex items-center justify-center text-lg font-serif text-[var(--c-text-muted)]">
                  {initials}
                </div>
              )}
              {requester?.is_online && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 border-2 border-[var(--c-bg-card)] rounded-full" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[var(--c-text-main)] truncate">
                {requester?.name || 'Unbekannt'}
              </h4>
              <div className="flex items-center gap-3 text-xs text-[var(--c-text-muted)] mt-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Level {pendingInvite.level}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingInvite.duration} min
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-[var(--c-bg-app)] text-[var(--c-text-muted)] rounded-xl border border-[var(--c-border)] font-medium hover:text-[var(--c-text-main)] transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              {t.session?.decline || 'Ablehnen'}
            </button>
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t.session?.accept || 'Annehmen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionInviteBanner;
