import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DyadRole, DyadConfig } from '../types';
import { X, Play, Pause, Volume2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { GONG_SOUNDS } from '../hooks/useGongTimer';

interface DyadTimerProps {
  onExit: () => void;
  prompt: string;
  sessionDuration?: number; // Gesamtdauer aus Session (20, 40, 60 min)
}

// Grundsettings je Session-Dauer
function getDefaultConfig(sessionDuration: number): DyadConfig {
  switch (sessionDuration) {
    case 20:
      return { contemplationMinutes: 0, rounds: 2, durationMinutes: 5, transitionSeconds: 10, soundUrl: GONG_SOUNDS[0].url };
    case 40:
      return { contemplationMinutes: 2, rounds: 4, durationMinutes: 5, transitionSeconds: 10, soundUrl: GONG_SOUNDS[0].url };
    case 60:
      return { contemplationMinutes: 2, rounds: 6, durationMinutes: 5, transitionSeconds: 10, soundUrl: GONG_SOUNDS[0].url };
    default:
      return { contemplationMinutes: 2, rounds: 4, durationMinutes: 5, transitionSeconds: 10, soundUrl: GONG_SOUNDS[0].url };
  }
}

function calcTotalMinutes(cfg: DyadConfig): number {
  const contemplation = cfg.contemplationMinutes;
  const speakingListening = cfg.rounds * 2 * cfg.durationMinutes;
  const transitions = (cfg.rounds * 2 - 1) * cfg.transitionSeconds / 60;
  return Math.round((contemplation + speakingListening + transitions) * 10) / 10;
}

const DyadTimer: React.FC<DyadTimerProps> = ({ onExit, prompt, sessionDuration = 40 }) => {
  const { t } = useSettings();

  // --- Phase: config vs running ---
  const [timerPhase, setTimerPhase] = useState<'config' | 'running'>('config');
  const [config, setConfig] = useState<DyadConfig>(() => getDefaultConfig(sessionDuration));

  // --- Running state ---
  const [currentRole, setCurrentRole] = useState<DyadRole>(DyadRole.CONTEMPLATION);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [round, setRound] = useState(1);
  const [showTime, setShowTime] = useState(true);
  const [nextAfterTransition, setNextAfterTransition] = useState<DyadRole>(DyadRole.SPEAKER);
  const showTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Config helpers ---
  const updateConfig = useCallback((partial: Partial<DyadConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  const previewSound = useCallback((url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.log('Audio preview blocked', e));
  }, []);

  // --- Start timer ---
  const handleStartTimer = useCallback(() => {
    audioRef.current = new Audio(config.soundUrl);
    setTimerPhase('running');
    setRound(1);
    if (config.contemplationMinutes > 0) {
      setCurrentRole(DyadRole.CONTEMPLATION);
      setTimeLeft(config.contemplationMinutes * 60);
    } else {
      setCurrentRole(DyadRole.SPEAKER);
      setTimeLeft(config.durationMinutes * 60);
    }
    setIsActive(true);
  }, [config]);

  // --- Play sound ---
  const playBell = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play blocked', e));
    }
  }, []);

  // --- Show time briefly on phase change ---
  useEffect(() => {
    if (timerPhase !== 'running') return;
    if (currentRole === DyadRole.COMPLETED) return;
    setShowTime(true);
    if (showTimeRef.current) clearTimeout(showTimeRef.current);
    showTimeRef.current = setTimeout(() => {
      setShowTime(false);
    }, 3000);
    return () => {
      if (showTimeRef.current) clearTimeout(showTimeRef.current);
    };
  }, [currentRole, timerPhase]);

  // --- Countdown ---
  useEffect(() => {
    if (timerPhase !== 'running') return;
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleTransition();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, timerPhase]);

  // --- Transition logic ---
  const handleTransition = useCallback(() => {
    playBell();

    switch (currentRole) {
      case DyadRole.CONTEMPLATION:
        // Nach Kontemplation → SPEAKER Runde 1
        setCurrentRole(DyadRole.SPEAKER);
        setTimeLeft(config.durationMinutes * 60);
        break;

      case DyadRole.SPEAKER:
        // Nach SPEAKER → TRANSITION (dann LISTENER)
        if (config.transitionSeconds > 0) {
          setNextAfterTransition(DyadRole.LISTENER);
          setCurrentRole(DyadRole.TRANSITION);
          setTimeLeft(config.transitionSeconds);
        } else {
          setCurrentRole(DyadRole.LISTENER);
          setTimeLeft(config.durationMinutes * 60);
        }
        break;

      case DyadRole.LISTENER:
        // Nach LISTENER → TRANSITION (dann SPEAKER oder COMPLETED)
        if (round < config.rounds) {
          if (config.transitionSeconds > 0) {
            setNextAfterTransition(DyadRole.SPEAKER);
            setCurrentRole(DyadRole.TRANSITION);
            setTimeLeft(config.transitionSeconds);
            setRound(r => r + 1);
          } else {
            setRound(r => r + 1);
            setCurrentRole(DyadRole.SPEAKER);
            setTimeLeft(config.durationMinutes * 60);
          }
        } else {
          setCurrentRole(DyadRole.COMPLETED);
          setIsActive(false);
        }
        break;

      case DyadRole.TRANSITION:
        // Nach TRANSITION → nextAfterTransition
        setCurrentRole(nextAfterTransition);
        setTimeLeft(config.durationMinutes * 60);
        break;

      default:
        break;
    }
  }, [currentRole, config, round, nextAfterTransition, playBell]);

  // --- Format ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getInstructions = () => {
    switch (currentRole) {
      case DyadRole.CONTEMPLATION: return t.timer?.instructionPrep || 'Nimm dir Zeit, die Frage auf dich wirken zu lassen.';
      case DyadRole.SPEAKER: return t.timer?.instructionSpeak || 'Teile deine Erfahrung mit.';
      case DyadRole.LISTENER: return t.timer?.instructionListen || 'Höre aufmerksam zu.';
      case DyadRole.TRANSITION: return t.timer?.instructionTransition || 'Wechsel — bereite dich auf die nächste Phase vor.';
      case DyadRole.COMPLETED: return t.timer?.instructionEnd || 'Die Übung ist beendet. Danke für eure Praxis.';
      default: return '';
    }
  };

  const getBgColor = () => {
    switch (currentRole) {
      case DyadRole.CONTEMPLATION: return 'bg-black/30 text-white';
      case DyadRole.SPEAKER: return 'bg-orange-500/20 text-white';
      case DyadRole.LISTENER: return 'bg-blue-500/20 text-white';
      case DyadRole.TRANSITION: return 'bg-amber-500/20 text-white';
      case DyadRole.COMPLETED: return 'bg-emerald-500/20 text-white';
      default: return 'bg-black/30 text-white';
    }
  };

  const getRoleLabel = () => {
    switch (currentRole) {
      case DyadRole.CONTEMPLATION: return t.timer?.preparation || 'Vorbereitung';
      case DyadRole.SPEAKER: return t.timer?.speaking || 'Sprechen';
      case DyadRole.LISTENER: return t.timer?.listening || 'Zuhören';
      case DyadRole.TRANSITION: return t.timer?.transition || 'Wechsel';
      case DyadRole.COMPLETED: return t.timer?.end || 'Ende';
      default: return '';
    }
  };

  // --- Progress for the current phase ---
  const getPhaseTotal = () => {
    if (currentRole === DyadRole.CONTEMPLATION) return config.contemplationMinutes * 60;
    if (currentRole === DyadRole.TRANSITION) return config.transitionSeconds;
    if (currentRole === DyadRole.COMPLETED) return 1;
    return config.durationMinutes * 60;
  };

  // ========== CONFIG SCREEN ==========
  if (timerPhase === 'config') {
    const totalMin = calcTotalMinutes(config);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-black/40 text-white">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
          <span className="text-sm font-medium tracking-widest uppercase">Dyadenpraxis</span>
          <button onClick={onExit} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="max-w-lg w-full px-6 space-y-6 overflow-y-auto max-h-[85vh] py-4" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          {/* Prompt */}
          <div className="text-center mb-2">
            <h2 className="text-xl md:text-2xl font-serif italic leading-relaxed">"{prompt}"</h2>
            <p className="text-sm opacity-50 mt-2">{sessionDuration} min Session</p>
          </div>

          {/* Runden */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest opacity-60 mb-2">
              {t.timer?.rounds || 'Runden'}
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  onClick={() => updateConfig({ rounds: n })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    config.rounds === n
                      ? 'bg-white/20 border border-white/40'
                      : 'border border-white/10 hover:border-white/30'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Dauer pro Durchgang */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest opacity-60 mb-2">
              {t.timer?.durationPerRound || 'Dauer pro Durchgang'}
            </label>
            <div className="flex flex-wrap gap-2">
              {[3, 4, 5, 7, 10].map(n => (
                <button
                  key={n}
                  onClick={() => updateConfig({ durationMinutes: n })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    config.durationMinutes === n
                      ? 'bg-white/20 border border-white/40'
                      : 'border border-white/10 hover:border-white/30'
                  }`}
                >
                  {n} min
                </button>
              ))}
            </div>
          </div>

          {/* Kontemplation */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest opacity-60 mb-2">
              {t.timer?.contemplation || 'Kontemplation'}
            </label>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => updateConfig({ contemplationMinutes: n })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    config.contemplationMinutes === n
                      ? 'bg-white/20 border border-white/40'
                      : 'border border-white/10 hover:border-white/30'
                  }`}
                >
                  {n === 0 ? 'Keine' : `${n} min`}
                </button>
              ))}
            </div>
          </div>

          {/* Wechselpause */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest opacity-60 mb-2">
              {t.timer?.transitionPause || 'Wechselpause'}
            </label>
            <div className="flex flex-wrap gap-2">
              {[0, 10, 20, 30].map(n => (
                <button
                  key={n}
                  onClick={() => updateConfig({ transitionSeconds: n })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    config.transitionSeconds === n
                      ? 'bg-white/20 border border-white/40'
                      : 'border border-white/10 hover:border-white/30'
                  }`}
                >
                  {n === 0 ? 'Keine' : `${n} sek`}
                </button>
              ))}
            </div>
          </div>

          {/* Klang */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest opacity-60 mb-2">
              {t.timer?.sound || 'Klang'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GONG_SOUNDS.map(sound => (
                <button
                  key={sound.id}
                  onClick={() => updateConfig({ soundUrl: sound.url })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    config.soundUrl === sound.url
                      ? 'bg-white/20 border border-white/40'
                      : 'border border-white/10 hover:border-white/30'
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); previewSound(sound.url); }}
                    className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="truncate">{sound.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Zusammenfassung */}
          <div className="text-center text-sm opacity-60 py-2">
            {config.contemplationMinutes > 0 && `${config.contemplationMinutes} min Kontemplation + `}
            {config.rounds} Runden × 2 × {config.durationMinutes} min
            {config.transitionSeconds > 0 && ` + ${config.transitionSeconds} sek Wechsel`}
            {' '}≈ {totalMin} min
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartTimer}
            className="w-full py-4 rounded-2xl font-medium text-lg flex items-center justify-center gap-3 bg-white/15 border border-white/30 hover:bg-white/25 transition-all"
          >
            <Play className="w-5 h-5" />
            {t.timer?.startTimer || 'Timer starten'}
          </button>
        </div>
      </div>
    );
  }

  // ========== RUNNING SCREEN ==========
  const phaseTotal = getPhaseTotal();
  const progressPercent = currentRole === DyadRole.COMPLETED
    ? 100
    : ((phaseTotal - timeLeft) / phaseTotal) * 100;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm transition-colors duration-1000 ${getBgColor()}`}>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-widest uppercase">Dyadenpraxis</span>
          <span className="text-xs opacity-50">
            {t.timer?.roundLabel || 'Runde'} {round}/{config.rounds}
          </span>
        </div>
        <button onClick={onExit} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center text-center max-w-xl px-8 fade-in" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
        {/* Role Indicator */}
        <div className="mb-8">
          <span className="inline-block px-4 py-1 rounded-full text-xs tracking-widest uppercase border border-current opacity-80">
            {getRoleLabel()}
          </span>
        </div>

        {/* Timer */}
        <div
          className="font-serif text-8xl md:text-9xl mb-6 font-light tracking-tighter tabular-nums transition-opacity duration-700 ease-in-out"
          style={{ opacity: showTime ? 0.9 : 0 }}
        >
          {formatTime(timeLeft)}
        </div>

        {/* Prompt */}
        <div className="mb-12 space-y-4">
          <h2 className="text-2xl md:text-3xl font-serif italic leading-relaxed">"{prompt}"</h2>
          <p className="text-lg opacity-60 font-light">{getInstructions()}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsActive(!isActive)}
            className="p-4 rounded-full border border-current hover:bg-white/10 transition-all"
          >
            {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <button onClick={playBell} className="p-4 rounded-full border border-current hover:bg-white/10 transition-all opacity-50 hover:opacity-100">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all duration-1000 ease-linear"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
};

export default DyadTimer;
