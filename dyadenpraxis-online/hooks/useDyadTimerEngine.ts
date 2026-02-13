import { useState, useCallback, useEffect, useRef } from 'react';
import { DyadRole, DyadConfig } from '../types';

export interface UseDyadTimerEngineReturn {
  // State
  config: DyadConfig | null;
  timerPhase: 'idle' | 'running' | 'completed';
  currentRole: DyadRole;
  timeLeft: number;
  isActive: boolean;
  round: number;
  totalTimerSeconds: number;
  isTimerRunning: boolean;

  // Actions
  startTimer: (config: DyadConfig) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  playBell: () => void;
}

export function calcTotalSeconds(cfg: DyadConfig): number {
  const contemplation = cfg.contemplationMinutes * 60;
  const speakingListening = cfg.rounds * 2 * cfg.durationMinutes * 60;
  const transitions = (cfg.rounds * 2 - 1) * cfg.transitionSeconds;
  return contemplation + speakingListening + transitions;
}

export function useDyadTimerEngine(): UseDyadTimerEngineReturn {
  const [config, setConfig] = useState<DyadConfig | null>(null);
  const [timerPhase, setTimerPhase] = useState<'idle' | 'running' | 'completed'>('idle');
  const [currentRole, setCurrentRole] = useState<DyadRole>(DyadRole.CONTEMPLATION);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [round, setRound] = useState(1);
  const [nextAfterTransition, setNextAfterTransition] = useState<DyadRole>(DyadRole.SPEAKER);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const configRef = useRef<DyadConfig | null>(null);
  const roundRef = useRef(1);
  const nextAfterTransitionRef = useRef<DyadRole>(DyadRole.SPEAKER);
  const currentRoleRef = useRef<DyadRole>(DyadRole.CONTEMPLATION);

  // Keep refs in sync
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { nextAfterTransitionRef.current = nextAfterTransition; }, [nextAfterTransition]);
  useEffect(() => { currentRoleRef.current = currentRole; }, [currentRole]);

  const playBell = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('[DyadTimer] Audio play blocked:', e));
    }
  }, []);

  const handleTransition = useCallback(() => {
    const cfg = configRef.current;
    const role = currentRoleRef.current;
    const r = roundRef.current;
    const nextRole = nextAfterTransitionRef.current;
    if (!cfg) return;

    // Gong at every transition
    playBell();

    switch (role) {
      case DyadRole.CONTEMPLATION:
        setCurrentRole(DyadRole.SPEAKER);
        setTimeLeft(cfg.durationMinutes * 60);
        break;

      case DyadRole.SPEAKER:
        if (cfg.transitionSeconds > 0) {
          setNextAfterTransition(DyadRole.LISTENER);
          setCurrentRole(DyadRole.TRANSITION);
          setTimeLeft(cfg.transitionSeconds);
        } else {
          setCurrentRole(DyadRole.LISTENER);
          setTimeLeft(cfg.durationMinutes * 60);
        }
        break;

      case DyadRole.LISTENER:
        if (r < cfg.rounds) {
          if (cfg.transitionSeconds > 0) {
            setNextAfterTransition(DyadRole.SPEAKER);
            setCurrentRole(DyadRole.TRANSITION);
            setTimeLeft(cfg.transitionSeconds);
            setRound(prev => prev + 1);
          } else {
            setRound(prev => prev + 1);
            setCurrentRole(DyadRole.SPEAKER);
            setTimeLeft(cfg.durationMinutes * 60);
          }
        } else {
          // Endgong — final transition
          setCurrentRole(DyadRole.COMPLETED);
          setIsActive(false);
          setTimerPhase('completed');
        }
        break;

      case DyadRole.TRANSITION:
        setCurrentRole(nextRole);
        setTimeLeft(cfg.durationMinutes * 60);
        break;

      default:
        break;
    }
  }, [playBell]);

  // Countdown effect
  useEffect(() => {
    if (timerPhase !== 'running') return;
    if (!isActive) return;

    if (timeLeft <= 0) {
      handleTransition();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Schedule transition for next tick
          setTimeout(() => handleTransition(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, timerPhase, handleTransition]);

  const startTimer = useCallback((cfg: DyadConfig) => {
    audioRef.current = new Audio(cfg.soundUrl);
    setConfig(cfg);
    configRef.current = cfg;
    setRound(1);
    roundRef.current = 1;
    setTimerPhase('running');

    if (cfg.contemplationMinutes > 0) {
      setCurrentRole(DyadRole.CONTEMPLATION);
      currentRoleRef.current = DyadRole.CONTEMPLATION;
      setTimeLeft(cfg.contemplationMinutes * 60);
    } else {
      setCurrentRole(DyadRole.SPEAKER);
      currentRoleRef.current = DyadRole.SPEAKER;
      setTimeLeft(cfg.durationMinutes * 60);
    }

    setIsActive(true);

    // Eingangsgong — play after a short delay so audio is ready
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log('[DyadTimer] Eingangsgong blocked:', e));
      }
    }, 100);
  }, []);

  const pauseTimer = useCallback(() => setIsActive(false), []);
  const resumeTimer = useCallback(() => setIsActive(true), []);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    setTimerPhase('idle');
    setCurrentRole(DyadRole.CONTEMPLATION);
    setTimeLeft(0);
    setRound(1);
    setConfig(null);
    configRef.current = null;
    audioRef.current = null;
  }, []);

  const totalTimerSeconds = config ? calcTotalSeconds(config) : 0;

  return {
    config,
    timerPhase,
    currentRole,
    timeLeft,
    isActive,
    round,
    totalTimerSeconds,
    isTimerRunning: timerPhase === 'running',

    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    playBell,
  };
}
