import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useDispute, DisputeType } from '../hooks/useDispute';
import { useSettings } from '../contexts/SettingsContext';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  disputedUserId: string;
  disputedUserName: string;
  disputedUserAvatar?: string | null;
  sessionId?: string;
  verificationId?: string;
  onSuccess?: () => void;
}

export default function DisputeModal({
  isOpen,
  onClose,
  disputedUserId,
  disputedUserName,
  disputedUserAvatar,
  sessionId,
  verificationId,
  onSuccess,
}: DisputeModalProps) {
  const { t } = useSettings();
  const { createDispute, isLoading, error } = useDispute();

  const [disputeType, setDisputeType] = useState<DisputeType>('other');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isValid = description.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      setLocalError(t.dispute?.descriptionTooShort || 'Beschreibung muss mindestens 10 Zeichen haben');
      return;
    }

    const result = await createDispute({
      dispute_type: disputeType,
      disputed_user_id: disputedUserId,
      session_id: sessionId,
      verification_id: verificationId,
      description: description.trim(),
    });

    if (result) {
      onSuccess?.();
      handleClose();
    }
  };

  const handleClose = () => {
    setDisputeType('other');
    setDescription('');
    setLocalError(null);
    onClose();
  };

  if (!isOpen) return null;

  const disputeTypeOptions: { value: DisputeType; label: string }[] = [
    { value: 'rating', label: t.dispute?.typeRating || 'Problematisches Rating' },
    { value: 'verification', label: t.dispute?.typeVerification || 'Falsche Verifikation' },
    { value: 'other', label: t.dispute?.typeOther || 'Sonstiges Verhalten' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--c-bg-card)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[var(--c-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="font-medium text-[var(--c-text-main)]">
                {t.dispute?.title || 'Nutzer melden'}
              </h2>
              <p className="text-sm text-[var(--c-text-muted)]">
                {disputedUserName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-[var(--c-bg-card-hover)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--c-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {(error || localError) && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm border border-rose-200 dark:border-rose-800/50">
              {error || localError}
            </div>
          )}

          {/* User Avatar & Name */}
          <div className="flex items-center gap-3 p-3 bg-[var(--c-bg-app)] rounded-xl">
            {disputedUserAvatar ? (
              <img
                src={disputedUserAvatar}
                alt={disputedUserName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--c-border)] flex items-center justify-center">
                <span className="text-[var(--c-text-muted)] font-medium">
                  {disputedUserName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-medium text-[var(--c-text-main)]">{disputedUserName}</span>
          </div>

          {/* Dispute Type */}
          <div>
            <label className="text-sm font-medium text-[var(--c-text-main)] block mb-2">
              {t.dispute?.typeLabel || 'Art der Meldung'}
            </label>
            <div className="space-y-2">
              {disputeTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${disputeType === option.value
                      ? 'border-[var(--c-accent)] bg-[var(--c-accent)]/5'
                      : 'border-[var(--c-border)] hover:border-[var(--c-text-muted)]'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="disputeType"
                    value={option.value}
                    checked={disputeType === option.value}
                    onChange={(e) => setDisputeType(e.target.value as DisputeType)}
                    className="w-4 h-4 accent-[var(--c-accent)]"
                  />
                  <span className="text-sm text-[var(--c-text-main)]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-[var(--c-text-main)] block mb-2">
              {t.dispute?.description || 'Beschreibung'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.dispute?.descriptionPlaceholder || 'Beschreibe das Problem moeglichst genau...'}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-[var(--c-bg-app)] border border-[var(--c-border)] text-[var(--c-text-main)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] placeholder:text-[var(--c-text-muted)]"
            />
            <p className="text-xs text-[var(--c-text-muted)] mt-1">
              {t.dispute?.minChars || 'Mindestens 10 Zeichen'} ({description.length}/10)
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-[var(--c-border)] text-[var(--c-text-main)] rounded-xl hover:bg-[var(--c-bg-card-hover)] transition-colors text-sm font-medium"
            >
              {t.dispute?.cancel || 'Abbrechen'}
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.dispute?.submitting || 'Senden...'}
                </>
              ) : (
                t.dispute?.submit || 'Meldung senden'
              )}
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-[var(--c-text-muted)] text-center">
            {t.dispute?.infoText || 'Deine Meldung wird von uns geprueft. Missbrauch kann zu Konsequenzen fuehren.'}
          </p>
        </form>
      </div>
    </div>
  );
}
