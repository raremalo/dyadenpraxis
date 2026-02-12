import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Copy, Check, X, Loader2, Link2, 
  Clock, UserCheck, AlertCircle, Plus, Trash2 
} from 'lucide-react';
import { useInvitations, type InvitationWithInvitee } from '../hooks/useInvitations';
import { useSettings } from '../contexts/SettingsContext';

/**
 * InvitationManager - Einladungen verwalten (Profil-Seite)
 */
export default function InvitationManager() {
  const { t } = useSettings();
  const {
    invitations,
    stats,
    isLoading,
    error,
    createInvitation,
    revokeInvitation,
    copyToClipboard,
    getShareUrl,
    canCreateMore,
  } = useInvitations();

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copiedToken) {
      const timer = setTimeout(() => setCopiedToken(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedToken]);

  const handleCreate = async () => {
    setIsCreating(true);
    const result = await createInvitation();
    if (result) {
      await copyToClipboard(result.token);
      setCopiedToken(result.token);
    }
    setIsCreating(false);
  };

  const handleCopy = async (token: string) => {
    const success = await copyToClipboard(token);
    if (success) {
      setCopiedToken(token);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setRevokingId(invitationId);
    await revokeInvitation(invitationId);
    setRevokingId(null);
  };

  const getInvitationStatus = (inv: InvitationWithInvitee): { label: string; color: string } => {
    if (inv.used_at) {
      return { 
        label: t('invitations', 'used'), 
        color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
      };
    }
    if (!inv.is_active) {
      return { 
        label: t('invitations', 'revoked'), 
        color: 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700' 
      };
    }
    if (new Date(inv.expires_at) <= new Date()) {
      return { 
        label: t('invitations', 'expired'), 
        color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
      };
    }
    return { 
      label: t('invitations', 'active'), 
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' 
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const daysRemaining = (expiresAt: string): number => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">
            {t('invitations', 'title')}
          </h3>
        </div>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {stats.active}/{MAX_ACTIVE} {t('invitations', 'active')}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={isCreating || !canCreateMore}
        className="w-full mb-4 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 dark:disabled:bg-stone-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
      >
        {isCreating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('invitations', 'creating')}
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            {t('invitations', 'create')}
          </>
        )}
      </button>

      {!canCreateMore && (
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 text-center">
          {t('invitations', 'limitReached')}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">{stats.active}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{t('invitations', 'active')}</p>
        </div>
        <div className="text-center p-2 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.used}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{t('invitations', 'used')}</p>
        </div>
        <div className="text-center p-2 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
          <p className="text-lg font-semibold text-stone-400">{stats.expired}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{t('invitations', 'expired')}</p>
        </div>
      </div>

      {/* Invitation List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-8">
          <Link2 className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <p className="text-stone-500 dark:text-stone-400">
            {t('invitations', 'noInvitations')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv) => {
            const status = getInvitationStatus(inv);
            const isActive = inv.is_active && !inv.used_at && new Date(inv.expires_at) > new Date();

            return (
              <div
                key={inv.id}
                className={`p-3 rounded-lg border ${
                  isActive 
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' 
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded">
                      {inv.token}
                    </code>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isActive && (
                      <>
                        <button
                          onClick={() => handleCopy(inv.token)}
                          className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                          title={t('invitations', 'copyLink')}
                        >
                          {copiedToken === inv.token ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-stone-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          disabled={revokingId === inv.id}
                          className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          title={t('invitations', 'revoke')}
                        >
                          {revokingId === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(inv.created_at)}
                  </span>
                  
                  {isActive && (
                    <span>
                      {daysRemaining(inv.expires_at)} {t('invitations', 'daysLeft')}
                    </span>
                  )}

                  {inv.used_at && inv.invited_user && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-green-500" />
                      {inv.invited_user.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MAX_ACTIVE = 10;

/**
 * InviteAcceptCard - Einladung annehmen (nach Token-Validierung)
 */
export function InviteAcceptCard({ 
  token,
  onAccepted,
  onDismissed,
}: {
  token: string;
  onAccepted: () => void;
  onDismissed: () => void;
}) {
  const { t } = useSettings();
  const { validateToken, redeemInvitation } = useInvitations();
  
  const [validation, setValidation] = useState<{
    inviter_name: string;
    inviter_avatar: string | null;
    is_valid: boolean;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validate = async () => {
      setIsValidating(true);
      const result = await validateToken(token);
      if (result) {
        setValidation({
          inviter_name: result.inviter_name,
          inviter_avatar: result.inviter_avatar,
          is_valid: result.is_valid,
        });
      } else {
        setError(t('invitations', 'invalidToken'));
      }
      setIsValidating(false);
    };
    validate();
  }, [token, validateToken, t]);

  const handleAccept = async () => {
    setIsRedeeming(true);
    setError(null);
    const success = await redeemInvitation(token);
    if (success) {
      onAccepted();
    } else {
      setError(t('invitations', 'redeemFailed'));
    }
    setIsRedeeming(false);
  };

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-stone-800 rounded-2xl shadow-lg">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-4" />
        <p className="text-stone-600 dark:text-stone-400">{t('invitations', 'validating')}</p>
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="flex flex-col items-center p-8 bg-white dark:bg-stone-800 rounded-2xl shadow-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">
          {t('invitations', 'invalidTitle')}
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-400 text-center mb-4">
          {error || t('invitations', 'invalidToken')}
        </p>
        <button
          onClick={onDismissed}
          className="px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600"
        >
          {t('invitations', 'close')}
        </button>
      </div>
    );
  }

  if (!validation.is_valid) {
    return (
      <div className="flex flex-col items-center p-8 bg-white dark:bg-stone-800 rounded-2xl shadow-lg">
        <Clock className="w-12 h-12 text-stone-400 mb-4" />
        <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">
          {t('invitations', 'expiredTitle')}
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-400 text-center mb-4">
          {t('invitations', 'expiredDesc')}
        </p>
        <button
          onClick={onDismissed}
          className="px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600"
        >
          {t('invitations', 'close')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-8 bg-white dark:bg-stone-800 rounded-2xl shadow-lg max-w-sm">
      {/* Inviter Avatar */}
      {validation.inviter_avatar ? (
        <img
          src={validation.inviter_avatar}
          alt={validation.inviter_name}
          className="w-16 h-16 rounded-full object-cover mb-4"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
          <span className="text-2xl font-medium text-amber-700 dark:text-amber-300">
            {validation.inviter_name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
        {t('invitations', 'invitedBy')}
      </h3>
      <p className="text-lg font-medium text-amber-600 dark:text-amber-400 mb-4">
        {validation.inviter_name}
      </p>
      <p className="text-sm text-stone-600 dark:text-stone-400 text-center mb-6">
        {t('invitations', 'inviteMessage')}
      </p>

      <div className="flex gap-3 w-full">
        <button
          onClick={onDismissed}
          className="flex-1 px-4 py-2.5 bg-stone-200 dark:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600 font-medium"
        >
          {t('invitations', 'decline')}
        </button>
        <button
          onClick={handleAccept}
          disabled={isRedeeming}
          className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {isRedeeming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {t('invitations', 'accept')}
        </button>
      </div>
    </div>
  );
}
