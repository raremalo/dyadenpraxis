import React, { useEffect, useState } from 'react';
import { Star, ThumbsUp, Loader2 } from 'lucide-react';
import { useFeedback, type UserRatingSummary } from '../hooks/useFeedback';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';
import { StarDisplay } from './StarRating';

interface FeedbackSummaryProps {
  userId: string;
  compact?: boolean;
}

export default function FeedbackSummary({ userId, compact = false }: FeedbackSummaryProps) {
  const { language } = useSettings();
  const t = translations[language];
  const { getUserRatingSummary } = useFeedback();
  
  const [summary, setSummary] = useState<UserRatingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getUserRatingSummary(userId)
      .then(setSummary)
      .finally(() => setIsLoading(false));
  }, [userId, getUserRatingSummary]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!summary || summary.total_reviews === 0) {
    return (
      <div className="text-center py-4 text-stone-500 dark:text-stone-400 text-sm">
        {t.feedback?.noRatings || 'Noch keine Bewertungen'}
      </div>
    );
  }

  // Compact version for partner cards
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StarDisplay value={summary.avg_overall} size="sm" showCount={summary.total_reviews} />
      </div>
    );
  }

  // Full version for profile view
  return (
    <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100 mb-4">
        {t.feedback?.ratings || 'Bewertungen'}
      </h3>

      {/* Overall rating highlight */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
          <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">
            {summary.avg_overall.toFixed(1)}
          </span>
        </div>
        <div className="text-sm text-stone-600 dark:text-stone-400">
          <p>{t.feedback?.basedOn || 'basierend auf'}</p>
          <p className="font-medium">
            {summary.total_reviews} {summary.total_reviews === 1 
              ? (t.feedback?.review || 'Bewertung') 
              : (t.feedback?.reviews || 'Bewertungen')
            }
          </p>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="space-y-3">
        {/* Structure */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600 dark:text-stone-400">
            {t.feedback?.structure || 'Struktur'}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(summary.avg_structure / 5) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 w-8">
              {summary.avg_structure.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Presence */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600 dark:text-stone-400">
            {t.feedback?.presence || 'Praesenz'}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(summary.avg_presence / 5) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 w-8">
              {summary.avg_presence.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Overall */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600 dark:text-stone-400">
            {t.feedback?.overall || 'Gesamt'}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(summary.avg_overall / 5) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 w-8">
              {summary.avg_overall.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Would practice again */}
      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <ThumbsUp className={`w-5 h-5 ${
            summary.would_practice_again_percent >= 80 
              ? 'text-green-500 fill-green-500' 
              : summary.would_practice_again_percent >= 50
              ? 'text-amber-500'
              : 'text-stone-400'
          }`} />
          <span className="text-sm text-stone-700 dark:text-stone-300">
            <span className="font-medium">{summary.would_practice_again_percent}%</span>
            {' '}{t.feedback?.wouldPracticeAgainStat || 'wuerden wieder praktizieren'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Inline badge for cards
interface RatingBadgeProps {
  rating: number;
  count: number;
}

export function RatingBadge({ rating, count }: RatingBadgeProps) {
  if (count === 0) return null;
  
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 rounded-full">
      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-amber-600 dark:text-amber-400">
        ({count})
      </span>
    </div>
  );
}
