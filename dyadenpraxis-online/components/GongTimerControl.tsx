import React, { useState } from 'react';
import { GongTimerConfig, GongMode, GongSoundOption } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Bell, Square, Play, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';

interface GongTimerControlProps {
  isActive: boolean;
  timeRemaining: number;
  completedIntervals: number;
  config: GongTimerConfig;
  onSetDuration: (seconds: number) => void;
  onSetMode: (mode: GongMode) => void;
  onSetSound: (soundId: string) => void;
  onStart: () => void;
  onStop: () => void;
  onPreview: (soundId?: string) => void;
  sounds: GongSoundOption[];
}

const PRESETS = [
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
  { value: 300, label: '5m' },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const GongTimerControl: React.FC<GongTimerControlProps> = ({
  isActive,
  timeRemaining,
  completedIntervals,
  config,
  onSetDuration,
  onSetMode,
  onSetSound,
  onStart,
  onStop,
  onPreview,
  sounds,
}) => {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(false);

  // Active countdown view
  if (isActive) {
    const progress = config.intervalSeconds > 0
      ? ((config.intervalSeconds - timeRemaining) / config.intervalSeconds) * 100
      : 0;

    return (
      <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 backdrop-blur-sm animate-pulse-slow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-medium tracking-widest uppercase opacity-70">
              {t.gong.title}
            </span>
          </div>
          {config.mode === 'repeating' && (
            <span className="text-xs opacity-60">
              {t.gong.round} {completedIntervals + 1}
            </span>
          )}
        </div>

        <div className="text-center mb-3">
          <span className="font-mono text-2xl tabular-nums opacity-90">
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-amber-500/60 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          onClick={onStop}
          className="w-full py-2.5 rounded-xl border border-current/20 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Square className="w-4 h-4" />
          {t.gong.stop}
        </button>
      </div>
    );
  }

  // Compact trigger (collapsed)
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between px-4 py-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 opacity-60" />
          <span className="text-sm font-medium opacity-70">{t.gong.title}</span>
        </div>
        <ChevronDown className="w-4 h-4 opacity-40" />
      </button>
    );
  }

  // Expanded configuration panel
  return (
    <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 opacity-60" />
          <span className="text-sm font-medium opacity-70">{t.gong.title}</span>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronUp className="w-4 h-4 opacity-40" />
        </button>
      </div>

      {/* Duration presets */}
      <div>
        <span className="text-xs opacity-50 uppercase tracking-wider">{t.gong.duration}</span>
        <div className="flex gap-2 mt-1.5">
          {PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => onSetDuration(preset.value)}
              className={`flex-1 px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                config.intervalSeconds === preset.value
                  ? 'border-current/40 bg-current/10 font-medium'
                  : 'border-current/10 hover:border-current/30 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom slider */}
      <div>
        <span className="text-xs opacity-50 uppercase tracking-wider">{t.gong.customDuration}</span>
        <div className="flex items-center gap-3 mt-1.5">
          <input
            type="range"
            min={30}
            max={300}
            step={15}
            value={config.intervalSeconds}
            onChange={(e) => onSetDuration(Number(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <span className="font-mono text-sm tabular-nums w-12 text-right opacity-70">
            {config.intervalSeconds}s
          </span>
        </div>
      </div>

      {/* Mode toggle */}
      <div>
        <span className="text-xs opacity-50 uppercase tracking-wider">Modus</span>
        <div className="flex gap-2 mt-1.5">
          <button
            onClick={() => onSetMode('single')}
            className={`flex-1 px-3 py-1.5 rounded-xl text-sm border transition-colors ${
              config.mode === 'single'
                ? 'border-current/40 bg-current/10 font-medium'
                : 'border-current/10 hover:border-current/30 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {t.gong.single}
          </button>
          <button
            onClick={() => onSetMode('repeating')}
            className={`flex-1 px-3 py-1.5 rounded-xl text-sm border transition-colors ${
              config.mode === 'repeating'
                ? 'border-current/40 bg-current/10 font-medium'
                : 'border-current/10 hover:border-current/30 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {t.gong.repeating}
          </button>
        </div>
      </div>

      {/* Sound selection */}
      <div>
        <span className="text-xs opacity-50 uppercase tracking-wider">{t.gong.sound}</span>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {sounds.map(sound => (
            <button
              key={sound.id}
              onClick={() => onSetSound(sound.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-colors ${
                config.soundId === sound.id
                  ? 'border-current/40 bg-current/10 font-medium'
                  : 'border-current/10 hover:border-current/30 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <span className="truncate flex-1 text-left">{sound.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(sound.id); }}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                title={t.gong.previewSound}
              >
                <Volume2 className="w-3 h-3 opacity-60" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" />
        {t.gong.start}
      </button>
    </div>
  );
};

export default GongTimerControl;
