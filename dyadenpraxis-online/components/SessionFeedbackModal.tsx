import React, { useState } from 'react';
import { X, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFeedback } from '../hooks/useFeedback';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';
import StarRating from './StarRating';

interface SessionFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  onSuccess?: () => void;
}

export default function SessionFeedbackModal({
  isOpen,
  onClose,
  sessionId,
  partnerId,
  partnerName,
  partnerAvatar,
  onSuccess,
}: SessionFeedbackModalProps) {
  const { language } = useSettings();
  const t = translations[language];
  const { submitFeedback, isLoading, error } = useFeedback();

  const [structureRating, setStructureRating] = useState(0);
  const [presenceRating, setPresenceRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [wouldPracticeAgain, setWouldPracticeAgain] = useState<boolean | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Check if form is valid
  const isValid = structureRating > 0 && 
                  presenceRating > 0 && 
                  overallRating > 0 && 
                  wouldPracticeAgain !== null;

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      setLocalError(t.feedback?.fillAllFields || 'Bitte fuelle alle Felder aus');
      return;
    }

    const result = await submitFeedback({
      session_id: sessionId,
      rated_user_id: partnerId,
      structure_rating: structureRating,
      presence_rating: presenceRating,
      overall_rating: overallRating,
      would_practice_again: wouldPracticeAgain!,
    });

    if (result) {
      onSuccess?.();
      onClose();
    }
  };

  // Reset form when closing
  const handleClose = () => {
    setStructureRating(0);
    setPresenceRating(0);
    setOverallRating(0);
    setWouldPracticeAgain(null);
    setLocalError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-3">
            {partnerAvatar ? (
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  {partnerName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 className="font-medium text-stone-900 dark:text-stone-100">
                {t.feedback?.rateSession || 'Session bewerten'}
              </h2>
              <p className="text-sm text-stone-500">
                {t.feedback?.with || 'mit'} {partnerName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {(error || localError) && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error || localError}
            </div>
          )}

          {/* Structure Rating */}
          <div>
            <StarRating
              value={structureRating}
              onChange={setStructureRating}
              size="lg"
              label={t.feedback?.structureRating || 'Struktur-Einhaltung'}
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {t.feedback?.structureDesc || 'Wurde die Dyaden-Struktur eingehalten?'}
            </p>
          </div>

          {/* Presence Rating */}
          <div>
            <StarRating
              value={presenceRating}
              onChange={setPresenceRating}
              size="lg"
              label={t.feedback?.presenceRating || 'Praesenz'}
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {t.feedback?.presenceDesc || 'War dein Partner aufmerksam und praesent?'}
            </p>
          </div>

          {/* Overall Rating */}
          <div>
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              size="lg"
              label={t.feedback?.overallRating || 'Gesamteindruck'}
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {t.feedback?.overallDesc || 'Wie war die Session insgesamt?'}
            </p>
          </div>

          {/* Would Practice Again */}
          <div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-2">
              {t.feedback?.wouldPracticeAgain || 'Wuerdest du wieder mit dieser Person praktizieren?'}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWouldPracticeAgain(true)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all
                  ${wouldPracticeAgain === true
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'border-stone-200 dark:border-stone-600 hover:border-green-300'
                  }
                `}
              >
                <ThumbsUp className={`w-5 h-5 ${wouldPracticeAgain === true ? 'fill-green-500' : ''}`} />
                <span>{t.feedback?.yes || 'Ja'}</span>
              </button>
              <button
                type="button"
                onClick={() => setWouldPracticeAgain(false)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all
                  ${wouldPracticeAgain === false
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'border-stone-200 dark:border-stone-600 hover:border-red-300'
                  }
                `}
              >
                <ThumbsDown className={`w-5 h-5 ${wouldPracticeAgain === false ? 'fill-red-500' : ''}`} />
                <span>{t.feedback?.no || 'Nein'}</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            >
              {t.feedback?.cancel || 'Abbrechen'}
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t.feedback?.submit || 'Bewertung abgeben'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
