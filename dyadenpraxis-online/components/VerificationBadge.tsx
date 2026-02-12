import React, { useState } from 'react';
import { CheckCircle, Users } from 'lucide-react';
import type { PeerVerification } from '../hooks/usePeerVerification';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';

interface VerificationBadgeProps {
  verifications: PeerVerification[];
  showCount?: boolean;
  size?: 'sm' | 'md';
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verifications,
  showCount = true,
  size = 'md',
}) => {
  const { language } = useSettings();
  const t = translations[language];
  const [showTooltip, setShowTooltip] = useState(false);

  const count = verifications.length;
  
  if (count === 0) return null;

  const sizeClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  // Get verified verifiers (those who are themselves verified)
  const verifiedVerifiers = verifications.filter(v => v.verifier?.trust_level === 'verified');

  return (
    <div className="relative inline-block">
      <div
        className={`
          flex items-center ${sizeClasses[size]} text-green-600 dark:text-green-400
          cursor-pointer
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <CheckCircle className={`${iconSizes[size]} fill-green-100 dark:fill-green-900`} />
        {showCount && (
          <span className={`font-medium ${textSizes[size]}`}>{count}</span>
        )}
      </div>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 p-3 min-w-[200px]">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-2">
              {t.trust?.verifiedBy || 'Verifiziert von'} {count} {count === 1 ? (t.trust?.person || 'Person') : (t.trust?.people || 'Personen')}
            </p>
            
            {verifiedVerifiers.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                {verifiedVerifiers.length} {t.trust?.verifiedVerifiers || 'verifizierte Verifizierer'}
              </p>
            )}
            
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {verifications.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center gap-2">
                  {v.verifier?.avatar_url ? (
                    <img
                      src={v.verifier.avatar_url}
                      alt={v.verifier.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                      <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400">
                        {v.verifier?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-stone-700 dark:text-stone-300 truncate">
                    {v.verifier?.name || 'Unbekannt'}
                  </span>
                  {v.verifier?.trust_level === 'verified' && (
                    <CheckCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                </div>
              ))}
              {count > 5 && (
                <p className="text-xs text-stone-500 pt-1">
                  +{count - 5} {t.trust?.more || 'weitere'}
                </p>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-stone-800" />
        </div>
      )}
    </div>
  );
};

export default VerificationBadge;

// Simple checkmark for verified users
interface VerifiedCheckProps {
  isVerified: boolean;
  size?: 'sm' | 'md';
}

export const VerifiedCheck: React.FC<VerifiedCheckProps> = ({ isVerified, size = 'md' }) => {
  if (!isVerified) return null;

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <CheckCircle 
      className={`${sizes[size]} text-amber-500 fill-amber-100 dark:fill-amber-900/50`} 
    />
  );
};
