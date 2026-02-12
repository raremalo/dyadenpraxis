import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, TrendingUp, Loader2, UserCheck, UserX } from 'lucide-react';
import { usePeerVerification, type PeerVerification, type VerificationStats } from '../hooks/usePeerVerification';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';
import TrustBadge from './TrustBadge';

interface ProfileVerificationCardProps {
  userId: string;
  showVerifyButton?: boolean;
  onVerificationChange?: () => void;
}

export default function ProfileVerificationCard({
  userId,
  showVerifyButton = false,
  onVerificationChange,
}: ProfileVerificationCardProps) {
  const { user } = useAuth();
  const { language } = useSettings();
  const t = translations[language];
  
  const {
    verifyUser,
    unverifyUser,
    hasVerified,
    getVerificationsFor,
    getVerificationStats,
    subscribeToVerifications,
    unsubscribe,
    isLoading,
  } = usePeerVerification();

  const [verifications, setVerifications] = useState<PeerVerification[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [isVerifiedByMe, setIsVerifiedByMe] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      const [fetchedVerifications, fetchedStats, verified] = await Promise.all([
        getVerificationsFor(userId),
        getVerificationStats(userId),
        hasVerified(userId),
      ]);
      setVerifications(fetchedVerifications);
      setStats(fetchedStats);
      setIsVerifiedByMe(verified);
      setIsLoadingData(false);
    };
    
    loadData();
  }, [userId, getVerificationsFor, getVerificationStats, hasVerified]);

  // Subscribe to realtime updates
  useEffect(() => {
    subscribeToVerifications(userId, (newVerifications) => {
      setVerifications(newVerifications);
      // Refresh stats when verifications change
      getVerificationStats(userId).then(setStats);
    });
    
    return () => unsubscribe();
  }, [userId, subscribeToVerifications, unsubscribe, getVerificationStats]);

  // Handle verify/unverify
  const handleToggleVerification = async () => {
    if (isVerifiedByMe) {
      const success = await unverifyUser(userId);
      if (success) {
        setIsVerifiedByMe(false);
        onVerificationChange?.();
      }
    } else {
      const success = await verifyUser(userId);
      if (success) {
        setIsVerifiedByMe(true);
        onVerificationChange?.();
      }
    }
  };

  // Can't verify yourself
  const canVerify = user && user.id !== userId;

  if (isLoadingData) {
    return (
      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          {t.trust?.verification || 'Verifizierung'}
        </h3>
        {stats && <TrustBadge level={stats.trust_level} size="md" />}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-stone-50 dark:bg-stone-900 rounded-lg p-3">
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">{t.trust?.verifications || 'Verifizierungen'}</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {stats.verification_count}
            </p>
          </div>
          <div className="bg-stone-50 dark:bg-stone-900 rounded-lg p-3">
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs">{t.trust?.byVerified || 'Von Verifizierten'}</span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {stats.verified_by_count}
            </p>
          </div>
        </div>
      )}

      {/* Progress to next level */}
      {stats && stats.trust_level !== 'verified' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-stone-600 dark:text-stone-400">
              {t.trust?.progressToNext || 'Fortschritt zum naechsten Level'}
            </span>
            <span className="text-stone-900 dark:text-stone-100 font-medium">
              {Math.round(stats.progress_to_next)}%
            </span>
          </div>
          <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.progress_to_next}%` }}
            />
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {stats.trust_level === 'new' 
              ? (t.trust?.needOneVerified || 'Benoetigt 1 Verifizierung von einem verifizierten Nutzer')
              : (t.trust?.needThreeVerified || 'Benoetigt 3 Verifizierungen von verifizierten Nutzern')
            }
          </p>
        </div>
      )}

      {/* Verifier list */}
      {verifications.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            {t.trust?.verifiedBy || 'Verifiziert von'}
          </p>
          <div className="flex flex-wrap gap-2">
            {verifications.slice(0, 6).map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 dark:bg-stone-700 rounded-full"
                title={v.verifier?.name}
              >
                {v.verifier?.avatar_url ? (
                  <img
                    src={v.verifier.avatar_url}
                    alt={v.verifier.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      {v.verifier?.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <span className="text-xs text-stone-700 dark:text-stone-300 max-w-[80px] truncate">
                  {v.verifier?.name}
                </span>
                {v.verifier?.trust_level === 'verified' && (
                  <ShieldCheck className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
              </div>
            ))}
            {verifications.length > 6 && (
              <span className="px-2 py-1 text-xs text-stone-500">
                +{verifications.length - 6} {t.trust?.more || 'weitere'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Verify button */}
      {showVerifyButton && canVerify && (
        <button
          onClick={handleToggleVerification}
          disabled={isLoading}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${isVerifiedByMe
              ? 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              : 'bg-amber-600 text-white hover:bg-amber-700'
            }
            disabled:opacity-50
          `}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isVerifiedByMe ? (
            <>
              <UserX className="w-4 h-4" />
              {t.trust?.removeVerification || 'Verifizierung entfernen'}
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              {t.trust?.verifyPerson || 'Person verifizieren'}
            </>
          )}
        </button>
      )}
    </div>
  );
}
