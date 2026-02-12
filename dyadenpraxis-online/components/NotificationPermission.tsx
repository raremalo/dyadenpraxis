import React from 'react';
import { Bell, BellOff, BellRing, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { usePushNotifications, NotificationPermissionState } from '../hooks/usePushNotifications';
import { useSettings } from '../contexts/SettingsContext';

interface NotificationPermissionProps {
  /** Kompakte Darstellung ohne Beschreibungstext */
  compact?: boolean;
  /** Callback nach erfolgreichem Subscribe */
  onSubscribed?: () => void;
  /** Callback nach erfolgreichem Unsubscribe */
  onUnsubscribed?: () => void;
}

/**
 * Komponente zur Verwaltung von Push-Notification-Berechtigungen
 * 
 * Zeigt aktuellen Status und erlaubt Aktivierung/Deaktivierung
 */
export const NotificationPermission: React.FC<NotificationPermissionProps> = ({
  compact = false,
  onSubscribed,
  onUnsubscribed,
}) => {
  const { t } = useSettings();
  const {
    permission,
    isSubscribed,
    isLoading,
    error,
    isSupported,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success && onUnsubscribed) onUnsubscribed();
    } else {
      const success = await subscribe();
      if (success && onSubscribed) onSubscribed();
    }
  };

  // Nicht unterstützt
  if (!isSupported) {
    return (
      <div className={`flex items-center gap-3 ${compact ? '' : 'p-4 bg-stone-100 dark:bg-stone-800 rounded-lg'}`}>
        <div className="p-2 bg-stone-200 dark:bg-stone-700 rounded-full">
          <BellOff className="w-5 h-5 text-stone-500" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-stone-700 dark:text-stone-300">
            {t.notifications.unsupported}
          </p>
          {!compact && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t.notifications.unsupportedDesc}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Permission verweigert
  if (permission === 'denied') {
    return (
      <div className={`flex items-center gap-3 ${compact ? '' : 'p-4 bg-red-50 dark:bg-red-900/20 rounded-lg'}`}>
        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-red-700 dark:text-red-300">
            {t.notifications.denied}
          </p>
          {!compact && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t.notifications.deniedDesc}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Status-Icon bestimmen
  const StatusIcon = isSubscribed ? BellRing : Bell;
  const statusColor = isSubscribed 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-stone-500 dark:text-stone-400';
  const bgColor = isSubscribed
    ? 'bg-green-100 dark:bg-green-900/40'
    : 'bg-stone-200 dark:bg-stone-700';

  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg'}`}>
      <div className={`p-2 ${bgColor} rounded-full`}>
        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-stone-700 dark:text-stone-300">
          {t.notifications.title}
        </p>
        {!compact && (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {isSubscribed 
              ? t.notifications.enabledDesc
              : t.notifications.disabledDesc
            }
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>

      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-colors
          ${isSubscribed
            ? 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
            : 'bg-amber-500 text-white hover:bg-amber-600'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2
        `}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSubscribed ? (
          <>
            <CheckCircle className="w-4 h-4" />
            {t.notifications.enabled}
          </>
        ) : (
          t.notifications.enable
        )}
      </button>
    </div>
  );
};

/**
 * Kleiner Toggle-Button für Header/Toolbar
 */
export const NotificationToggle: React.FC = () => {
  const {
    isSubscribed,
    isLoading,
    isSupported,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported || permission === 'denied') {
    return null;
  }

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        p-2 rounded-full transition-colors
        ${isSubscribed
          ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
          : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
        }
        disabled:opacity-50
      `}
      title={isSubscribed ? 'Benachrichtigungen deaktivieren' : 'Benachrichtigungen aktivieren'}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isSubscribed ? (
        <BellRing className="w-5 h-5" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
    </button>
  );
};

/**
 * Banner für erstmalige Aktivierung (z.B. nach Login)
 */
export const NotificationBanner: React.FC<{
  onDismiss: () => void;
}> = ({ onDismiss }) => {
  const { t } = useSettings();
  const { isSubscribed, isSupported, permission, subscribe, isLoading } = usePushNotifications();

  // Nicht anzeigen wenn bereits subscribed, nicht unterstützt, oder denied
  if (isSubscribed || !isSupported || permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) onDismiss();
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
      <div className="flex items-center gap-3 max-w-4xl mx-auto">
        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
          {t.notifications.bannerText}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {t.notifications.enable}
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-amber-700 dark:text-amber-300 text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg"
          >
            {t.notifications.later}
          </button>
        </div>
      </div>
    </div>
  );
};
