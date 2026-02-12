import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  label,
  showValue = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div 
          className={`flex ${gapClasses[size]}`}
          onMouseLeave={handleMouseLeave}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              disabled={readonly}
              className={`
                transition-colors focus:outline-none
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              `}
            >
              <Star
                className={`
                  ${sizeClasses[size]}
                  transition-colors
                  ${star <= displayValue
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-stone-300 dark:text-stone-600'
                  }
                `}
              />
            </button>
          ))}
        </div>
        {showValue && (
          <span className="text-sm text-stone-600 dark:text-stone-400 min-w-[2rem]">
            {value > 0 ? value.toFixed(1) : '-'}
          </span>
        )}
      </div>
    </div>
  );
};

export default StarRating;

// Compact inline star display for profiles/cards
interface StarDisplayProps {
  value: number;
  size?: 'xs' | 'sm';
  showCount?: number;
}

export const StarDisplay: React.FC<StarDisplayProps> = ({
  value,
  size = 'sm',
  showCount,
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
  };

  // Round to nearest 0.5
  const roundedValue = Math.round(value * 2) / 2;
  const fullStars = Math.floor(roundedValue);
  const hasHalfStar = roundedValue % 1 !== 0;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`
              ${sizeClasses[size]}
              ${star <= fullStars
                ? 'fill-amber-400 text-amber-400'
                : star === fullStars + 1 && hasHalfStar
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-transparent text-stone-300 dark:text-stone-600'
              }
            `}
          />
        ))}
      </div>
      {value > 0 && (
        <span className="text-xs text-stone-600 dark:text-stone-400">
          {value.toFixed(1)}
        </span>
      )}
      {showCount !== undefined && (
        <span className="text-xs text-stone-500">
          ({showCount})
        </span>
      )}
    </div>
  );
};
