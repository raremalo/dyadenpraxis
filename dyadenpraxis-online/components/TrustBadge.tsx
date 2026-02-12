import React from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';
import type { TrustLevel } from '../hooks/usePeerVerification';

interface TrustBadgeProps {
  level: TrustLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  level,
  size = 'md',
  showLabel = true,
  showIcon = true,
}) => {
  const { language } = useSettings();
  const t = translations[language];

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const config = {
    new: {
      bg: 'bg-stone-100 dark:bg-stone-700',
      text: 'text-stone-600 dark:text-stone-400',
      icon: Shield,
      label: t.trust?.new || 'Neu',
    },
    known: {
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      text: 'text-blue-700 dark:text-blue-300',
      icon: ShieldCheck,
      label: t.trust?.known || 'Bekannt',
    },
    verified: {
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      text: 'text-amber-700 dark:text-amber-300',
      icon: ShieldCheck,
      label: t.trust?.verified || 'Verifiziert',
    },
  };

  const { bg, text, icon: Icon, label } = config[level];

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${bg} ${text} ${sizeClasses[size]}
      `}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${level === 'verified' ? 'fill-amber-400' : ''}`} />}
      {showLabel && <span>{label}</span>}
    </span>
  );
};

export default TrustBadge;

// Inline trust indicator for minimal display
interface TrustIndicatorProps {
  level: TrustLevel;
}

export const TrustIndicator: React.FC<TrustIndicatorProps> = ({ level }) => {
  const colors = {
    new: 'bg-stone-400',
    known: 'bg-blue-500',
    verified: 'bg-amber-500',
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[level]}`}
      title={level}
    />
  );
};
