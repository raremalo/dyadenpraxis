import React from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize, Minimize, Timer, Settings, EyeOff, Eye, Ear, MessageCircle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { DyadRole } from '../../types';

interface VideoControlsProps {
  participantCount: number;
  effectivePhase?: DyadRole | null;
  onTimerToggle?: () => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  hideSelf: boolean;
  onToggleHideSelf: () => void;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  isVideoEnabled: boolean;
  onToggleVideo: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onLeave: () => void;
}

/**
 * VideoControls — bottom control bar with participant count, phase indicator,
 * timer/settings/self-view/audio/video/fullscreen toggles, and leave button.
 * Extracted from VideoRoom.tsx (Phase 6 decomposition). No logic change.
 */
const VideoControls: React.FC<VideoControlsProps> = ({
  participantCount, effectivePhase, onTimerToggle,
  showSettings, onToggleSettings, settingsButtonRef,
  hideSelf, onToggleHideSelf,
  isAudioEnabled, onToggleAudio,
  isVideoEnabled, onToggleVideo,
  isFullscreen, onToggleFullscreen, onLeave,
}) => {
  const { t } = useSettings();

  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-[var(--c-bg-app)] border-t border-[var(--c-border)]">
      <span className="text-sm text-[var(--c-text-muted)] mr-auto">
        {participantCount} {t.video?.participants || 'Teilnehmer'}
      </span>

      {effectivePhase && (
        <div
          className={`p-3 rounded-full transition-all duration-700 cursor-default ${
            effectivePhase === DyadRole.SPEAKER
              ? 'bg-orange-500 text-white'
              : effectivePhase === DyadRole.LISTENER
              ? 'bg-blue-500 text-white'
              : ''
          }`}
          title={effectivePhase === DyadRole.SPEAKER ? 'Sprechen' : 'Zuhören'}
        >
          {effectivePhase === DyadRole.SPEAKER
            ? <MessageCircle className="w-5 h-5" />
            : <Ear className="w-5 h-5" />
          }
        </div>
      )}

      {onTimerToggle && (
        <button
          onClick={onTimerToggle}
          className="p-3 rounded-full bg-[var(--c-accent)]/15 text-[var(--c-accent)] hover:bg-[var(--c-accent)]/25 transition-colors"
          title={t.timer?.label || 'Intervall-Gong'}
        >
          <Timer className="w-5 h-5" />
        </button>
      )}

      <button
        ref={settingsButtonRef}
        onClick={onToggleSettings}
        className={`p-3 rounded-full transition-colors ${
          showSettings
            ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
            : 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)]'
        }`}
        title={t.video?.settings || 'Einstellungen'}
      >
        <Settings className="w-5 h-5" />
      </button>

      <button
        onClick={onToggleHideSelf}
        className={`p-3 rounded-full transition-colors ${
          hideSelf
            ? 'bg-amber-500/20 text-amber-500'
            : 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)]'
        }`}
        title={hideSelf ? (t.video?.showSelf || 'Eigenes Video einblenden') : (t.video?.hideSelf || 'Eigenes Video ausblenden')}
      >
        {hideSelf ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>

      <button
        onClick={onToggleAudio}
        className={`p-3 rounded-full transition-colors ${
          isAudioEnabled
            ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)]'
            : 'bg-rose-500 text-white'
        }`}
        title={isAudioEnabled ? (t.video?.muteAudio || 'Stummschalten') : (t.video?.unmuteAudio || 'Ton aktivieren')}
      >
        {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>

      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full transition-colors ${
          isVideoEnabled
            ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)]'
            : 'bg-rose-500 text-white'
        }`}
        title={isVideoEnabled ? (t.video?.disableVideo || 'Video deaktivieren') : (t.video?.enableVideo || 'Video aktivieren')}
      >
        {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>

      <button
        onClick={onToggleFullscreen}
        className="p-3 rounded-full bg-[var(--c-bg-card)] text-[var(--c-text-main)] hover:bg-[var(--c-bg-card-hover)] transition-colors"
        title={isFullscreen ? (t.video?.exitFullscreen || 'Vollbild beenden') : (t.video?.fullscreen || 'Vollbild')}
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      <button
        onClick={onLeave}
        className="p-3 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-colors ml-auto"
        title={t.video?.leave || 'Verlassen'}
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
};

export default VideoControls;
