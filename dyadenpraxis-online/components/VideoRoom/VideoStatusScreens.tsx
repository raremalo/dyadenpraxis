import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export type VideoStatus = 'checking' | 'denied' | 'error' | 'connecting';

interface VideoStatusScreensProps {
  status: VideoStatus;
  errorMessage?: string;
  onRetry: () => void;
  onLeave: () => void;
}

/**
 * VideoStatusScreens — permission/error/loading/connecting states for the video room.
 * Extracted from VideoRoom.tsx (Phase 6 decomposition). No logic change.
 */
const VideoStatusScreens: React.FC<VideoStatusScreensProps> = ({
  status,
  errorMessage,
  onRetry,
  onLeave,
}) => {
  const { t } = useSettings();

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin mb-4" />
        <p className="text-[var(--c-text-muted)]">{t.video?.checkingPermissions || 'Berechtigungen pruefen...'}</p>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">{t.video?.permissionDenied || 'Zugriff verweigert'}</h3>
        <p className="text-[var(--c-text-muted)] text-center text-sm max-w-xs">
          {t.video?.permissionDeniedText || 'Bitte erlaube den Zugriff auf Kamera und Mikrofon in deinen Browser-Einstellungen.'}
        </p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-xl text-sm font-medium"
        >
          {t.video?.retry || 'Erneut versuchen'}
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">{t.video?.error || 'Fehler'}</h3>
        <p className="text-[var(--c-text-muted)] text-center text-sm max-w-xs">{errorMessage}</p>
        <button
          onClick={onLeave}
          className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium"
        >
          {t.video?.close || 'Schliessen'}
        </button>
      </div>
    );
  }

  // status === 'connecting'
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--c-bg-card)] rounded-2xl p-8">
      <Loader2 className="w-8 h-8 text-[var(--c-accent)] animate-spin mb-4" />
      <p className="text-[var(--c-text-muted)]">{t.video?.connecting || 'Verbinde...'}</p>
    </div>
  );
};

export default VideoStatusScreens;
