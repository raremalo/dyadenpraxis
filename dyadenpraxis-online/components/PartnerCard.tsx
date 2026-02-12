import React from 'react';
import { MessageCircle, Shield, ShieldCheck, Clock } from 'lucide-react';
import { Partner, TrustLevel } from '../hooks/usePartnerSearch';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

interface PartnerCardProps {
  partner: Partner;
  onMessage?: (partnerId: string) => void;
  onSelect?: (partner: Partner) => void;
  showMatchReasons?: boolean;
}

const TrustBadge: React.FC<{ level: TrustLevel }> = ({ level }) => {
  if (level === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-medium">
        <ShieldCheck className="w-3 h-3" />
        Verifiziert
      </span>
    );
  }
  if (level === 'known') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
        <Shield className="w-3 h-3" />
        Bekannt
      </span>
    );
  }
  return null;
};

const PartnerCard: React.FC<PartnerCardProps> = ({
  partner,
  onMessage,
  onSelect,
  showMatchReasons = false,
}) => {
  const { t } = useSettings();
  const { onlineUserIds } = useAuth();

  const initials = partner.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Presence-State als primaere Quelle, DB-Wert als Fallback
  const isOnline = onlineUserIds.has(partner.id) || partner.is_online;

  const statusColor = isOnline
    ? 'bg-emerald-400'
    : 'bg-slate-300';

  const statusText = isOnline
    ? (partner.is_available ? 'online' : 'beschaeftigt')
    : 'offline';

  const matchReasonLabels: Record<string, string> = {
    shared_levels: t.partnerCard?.sharedLevels || 'Gleiche Level',
    same_duration: t.partnerCard?.sameDuration || 'Gleiche Dauer',
    verified: t.partnerCard?.verified || 'Verifiziert',
    online: t.partnerCard?.online || 'Online',
  };

  return (
    <div
      onClick={() => onSelect?.(partner)}
      className="flex items-center p-4 bg-[var(--c-bg-card)] rounded-2xl border border-[var(--c-border)] shadow-sm hover:border-[var(--c-text-muted)] transition-colors cursor-pointer"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {partner.avatar_url ? (
          <img
            src={partner.avatar_url}
            alt={partner.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--c-bg-app)] flex items-center justify-center text-[var(--c-text-muted)] font-serif text-lg">
            {initials}
          </div>
        )}
        <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[var(--c-bg-card)] rounded-full ${statusColor}`} />
      </div>

      {/* Info */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-[var(--c-text-main)] truncate">{partner.name}</h4>
          <TrustBadge level={partner.trust_level} />
        </div>

        {partner.bio && (
          <p className="text-xs text-[var(--c-text-muted)] font-light truncate mb-1">
            {partner.bio}
          </p>
        )}

        <div className="flex items-center gap-3 text-[10px] text-[var(--c-text-muted)]">
          <span className="uppercase tracking-wide">{statusText}</span>
          {partner.sessions_completed > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {partner.sessions_completed} {t.partnerCard?.sessions || 'Sessions'}
            </span>
          )}
        </div>

        {/* Match Reasons */}
        {showMatchReasons && partner.match_reasons && partner.match_reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {partner.match_reasons.map((reason) => (
              <span
                key={reason}
                className="px-2 py-0.5 bg-[var(--c-accent)]/10 text-[var(--c-accent)] rounded-full text-[10px]"
              >
                {matchReasonLabels[reason] || reason}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {onMessage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMessage(partner.id);
          }}
          className="ml-2 p-2 text-[var(--c-text-muted)] hover:text-[var(--c-text-main)] hover:bg-[var(--c-bg-app)] rounded-full transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default PartnerCard;
