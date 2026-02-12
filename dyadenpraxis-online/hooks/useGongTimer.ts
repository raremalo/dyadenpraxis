import { useState, useEffect, useRef, useCallback } from 'react';
import { GongTimerConfig, GongMode, GongSoundOption, GongEvent } from '../types';

export const GONG_SOUNDS: GongSoundOption[] = [
  { id: 'big-bowl', name: 'Große Klangschale', url: 'https://cdn.freesound.org/previews/116/116315_2061858-lq.mp3' },
  { id: 'bowl-raw', name: 'Klangschale Roh', url: 'https://cdn.freesound.org/previews/389/389522_5450487-lq.mp3' },
  { id: 'bell', name: 'Meditations-Glocke', url: 'https://cdn.freesound.org/previews/42/42095_317797-lq.mp3' },
  { id: 'burma-bell', name: 'Burma-Glocke', url: 'https://cdn.freesound.org/previews/94/94024_469745-lq.mp3' },
];

interface UseGongTimerOptions {
  isEnabled: boolean;
  initialConfig?: GongTimerConfig;
  onEvent?: (event: GongEvent) => void;
}

interface UseGongTimerReturn {
  isActive: boolean;
  timeRemaining: number;
  completedIntervals: number;
  config: GongTimerConfig;
  setIntervalDuration: (seconds: number) => void;
  setMode: (mode: GongMode) => void;
  setSound: (soundId: string) => void;
  startGong: () => void;
  stopGong: () => void;
  previewSound: (soundId?: string) => void;
  availableSounds: GongSoundOption[];
}

const DEFAULT_CONFIG: GongTimerConfig = {
  intervalSeconds: 60,
  mode: 'single',
  soundId: 'big-bowl',
};

function getSoundUrl(soundId: string): string {
  const sound = GONG_SOUNDS.find(s => s.id === soundId);
  return sound?.url ?? GONG_SOUNDS[0].url;
}

export function useGongTimer({
  isEnabled,
  initialConfig,
  onEvent,
}: UseGongTimerOptions): UseGongTimerReturn {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const [config, setConfig] = useState<GongTimerConfig>(initialConfig ?? DEFAULT_CONFIG);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(getSoundUrl(config.soundId));
    audioRef.current.preload = 'auto';
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update audio source when sound changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = getSoundUrl(config.soundId);
      audioRef.current.load();
    }
  }, [config.soundId]);

  const emitEvent = useCallback((type: GongEvent['type']) => {
    onEventRef.current?.({
      type,
      timestamp: Date.now(),
      config,
    });
  }, [config]);

  const playGong = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Gong audio play blocked:', e));
    }
  }, []);

  // Auto-stop when role changes away from SPEAKER
  useEffect(() => {
    if (!isEnabled && isActive) {
      setIsActive(false);
      setTimeRemaining(0);
      setCompletedIntervals(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      emitEvent('stop');
    }
  }, [isEnabled, isActive, emitEvent]);

  // Countdown logic
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeRemaining === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      playGong();

      if (config.mode === 'single') {
        setIsActive(false);
        emitEvent('complete');
      } else {
        // Repeating mode: restart
        setCompletedIntervals(prev => prev + 1);
        setTimeRemaining(config.intervalSeconds);
        emitEvent('repeat');
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, timeRemaining, config.mode, config.intervalSeconds, playGong, emitEvent]);

  const startGong = useCallback(() => {
    if (!isEnabled) return;

    // Stop existing gong if running
    if (isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    playGong();
    setTimeRemaining(config.intervalSeconds);
    setCompletedIntervals(0);
    setIsActive(true);
    emitEvent('start');
  }, [isEnabled, isActive, config.intervalSeconds, playGong, emitEvent]);

  const stopGong = useCallback(() => {
    setIsActive(false);
    setTimeRemaining(0);
    setCompletedIntervals(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    emitEvent('stop');
  }, [emitEvent]);

  const setIntervalDuration = useCallback((seconds: number) => {
    setConfig(prev => ({ ...prev, intervalSeconds: seconds }));
  }, []);

  const setMode = useCallback((mode: GongMode) => {
    setConfig(prev => ({ ...prev, mode }));
  }, []);

  const setSound = useCallback((soundId: string) => {
    setConfig(prev => ({ ...prev, soundId }));
  }, []);

  const previewSound = useCallback((soundId?: string) => {
    const url = getSoundUrl(soundId ?? config.soundId);
    const previewAudio = new Audio(url);
    previewAudio.play().catch(e => console.log('Preview play blocked:', e));
  }, [config.soundId]);

  return {
    isActive,
    timeRemaining,
    completedIntervals,
    config,
    setIntervalDuration,
    setMode,
    setSound,
    startGong,
    stopGong,
    previewSound,
    availableSounds: GONG_SOUNDS,
  };
}
