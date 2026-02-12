import React, { useState, useEffect, useRef } from 'react';
import { DyadRole, DyadConfig } from '../types';
import { Bell, RefreshCw, X, Play, Pause, Volume2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useGongTimer } from '../hooks/useGongTimer';
import GongTimerControl from './GongTimerControl';

interface DyadTimerProps {
  onExit: () => void;
  prompt: string;
}

const DyadTimer: React.FC<DyadTimerProps> = ({ onExit, prompt }) => {
  const { t, gongConfig } = useSettings();
  const [currentRole, setCurrentRole] = useState<DyadRole>(DyadRole.CONTEMPLATION);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [round, setRound] = useState(1);
  const [showTime, setShowTime] = useState(true);
  const showTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const config: DyadConfig = {
    durationMinutes: 40,
    contemplationMinutes: 2,
    switchIntervalMinutes: 5,
    rounds: 4,
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const gongTimer = useGongTimer({
    isEnabled: currentRole === DyadRole.SPEAKER,
    initialConfig: gongConfig,
  });

  // Zeitanzeige bei Phasenwechsel kurz einblenden, dann ausblenden
  useEffect(() => {
    if (currentRole === DyadRole.COMPLETED) return;
    setShowTime(true);
    if (showTimeRef.current) clearTimeout(showTimeRef.current);
    showTimeRef.current = setTimeout(() => {
      setShowTime(false);
    }, 3000);
    return () => {
      if (showTimeRef.current) clearTimeout(showTimeRef.current);
    };
  }, [currentRole]);

  useEffect(() => {
    setTimeLeft(config.contemplationMinutes * 60);
    setIsActive(true);
    audioRef.current = new Audio("https://cdn.freesound.org/previews/234/234560_4019029-lq.mp3"); 
  }, []);

  const playBell = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleTransition();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, currentRole]);

  const handleTransition = () => {
    playBell();
    gongTimer.stopGong();
    
    switch (currentRole) {
      case DyadRole.CONTEMPLATION:
        setCurrentRole(DyadRole.SPEAKER);
        setTimeLeft(config.switchIntervalMinutes * 60);
        break;
      case DyadRole.SPEAKER:
        setCurrentRole(DyadRole.LISTENER);
        setTimeLeft(config.switchIntervalMinutes * 60);
        break;
      case DyadRole.LISTENER:
        if (round < config.rounds) {
           setRound(r => r + 1);
           setCurrentRole(DyadRole.SPEAKER);
           setTimeLeft(config.switchIntervalMinutes * 60);
        } else {
           setCurrentRole(DyadRole.COMPLETED);
           setIsActive(false);
        }
        break;
      default:
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getInstructions = () => {
    switch (currentRole) {
      case DyadRole.CONTEMPLATION: return t.timer.instructionPrep;
      case DyadRole.SPEAKER: return t.timer.instructionSpeak;
      case DyadRole.LISTENER: return t.timer.instructionListen;
      case DyadRole.TRANSITION: return t.timer.instructionTransition;
      case DyadRole.COMPLETED: return t.timer.instructionEnd;
      default: return "";
    }
  };

  const getBgColor = () => {
    switch (currentRole) {
      // Using Tailwind specific classes for the timer states as they are functional colors, 
      // but modifying them to respect dark mode somewhat or keep their semantic meaning
      case DyadRole.CONTEMPLATION: return "bg-[var(--c-bg-app)] text-[var(--c-text-main)]";
      case DyadRole.SPEAKER: return "bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-100";
      case DyadRole.LISTENER: return "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100";
      case DyadRole.COMPLETED: return "bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100";
      default: return "bg-[var(--c-bg-app)]";
    }
  };

  const getRoleLabel = () => {
    switch(currentRole) {
        case DyadRole.CONTEMPLATION: return t.timer.preparation;
        case DyadRole.SPEAKER: return t.timer.speaking;
        case DyadRole.LISTENER: return t.timer.listening;
        case DyadRole.COMPLETED: return t.timer.end;
        default: return "";
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-1000 ${getBgColor()}`}>
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tracking-widest uppercase">Dyadenpraxis</span>
        </div>
        <button onClick={onExit} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center text-center max-w-xl px-8 fade-in">
        
        {/* Role Indicator */}
        <div className="mb-8">
          <span className={`inline-block px-4 py-1 rounded-full text-xs tracking-widest uppercase border border-current opacity-80`}>
            {getRoleLabel()}
          </span>
        </div>

        {/* Timer - standardmaessig ausgeblendet, bei Phasenwechsel 3s sichtbar */}
        <div
          className="font-serif text-8xl md:text-9xl mb-6 font-light tracking-tighter tabular-nums transition-opacity duration-700 ease-in-out"
          style={{ opacity: showTime ? 0.9 : 0 }}
        >
          {formatTime(timeLeft)}
        </div>

        {/* Prompt */}
        <div className="mb-12 space-y-4">
           <h2 className="text-2xl md:text-3xl font-serif italic leading-relaxed">
            "{prompt}"
          </h2>
          <p className="text-lg opacity-60 font-light">{getInstructions()}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsActive(!isActive)}
            className="p-4 rounded-full border border-current hover:bg-black/5 dark:hover:bg-white/10 transition-all"
          >
            {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          
          <button onClick={playBell} className="p-4 rounded-full border border-current hover:bg-black/5 dark:hover:bg-white/10 transition-all opacity-50 hover:opacity-100">
             <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* Gong Timer (only visible for Speaker) */}
        {currentRole === DyadRole.SPEAKER && (
          <div className="mt-8 w-full max-w-sm">
            <GongTimerControl
              isActive={gongTimer.isActive}
              timeRemaining={gongTimer.timeRemaining}
              completedIntervals={gongTimer.completedIntervals}
              config={gongTimer.config}
              onSetDuration={gongTimer.setIntervalDuration}
              onSetMode={gongTimer.setMode}
              onSetSound={gongTimer.setSound}
              onStart={gongTimer.startGong}
              onStop={gongTimer.stopGong}
              onPreview={gongTimer.previewSound}
              sounds={gongTimer.availableSounds}
            />
          </div>
        )}

      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-1000 ease-linear" 
           style={{ width: `${currentRole === DyadRole.COMPLETED ? 100 : ((config.switchIntervalMinutes * 60 - timeLeft) / (config.switchIntervalMinutes * 60)) * 100}%` }} 
      />
    </div>
  );
};

export default DyadTimer;
