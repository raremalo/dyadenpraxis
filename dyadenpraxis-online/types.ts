export enum AppView {
  HOME = 'HOME',
  INSTRUCTIONS = 'INSTRUCTIONS',
  CONNECT = 'CONNECT', // Quick Match
  PARTNER_FINDER = 'PARTNER_FINDER', // Directory
  SESSION = 'SESSION',
  PROFILE = 'PROFILE',
  CALENDAR = 'CALENDAR',
  GROUPS = 'GROUPS',
}

export enum DyadRole {
  SPEAKER = 'SPEAKER',
  LISTENER = 'LISTENER',
  CONTEMPLATION = 'CONTEMPLATION',
  TRANSITION = 'TRANSITION',
  COMPLETED = 'COMPLETED',
}

export interface DyadConfig {
  durationMinutes: number;
  contemplationMinutes: number;
  switchIntervalMinutes: number;
  rounds: number;
}

// --- Gong Timer Types ---

export type GongMode = 'single' | 'repeating';

export interface GongSoundOption {
  id: string;
  name: string;
  url: string;
}

export interface GongTimerConfig {
  intervalSeconds: number;
  mode: GongMode;
  soundId: string;
}

export interface GongTimerState {
  isActive: boolean;
  timeRemaining: number;
  completedIntervals: number;
  config: GongTimerConfig;
}

export interface GongEvent {
  type: 'start' | 'stop' | 'complete' | 'repeat';
  timestamp: number;
  config: GongTimerConfig;
}

export interface PromptResponse {
  question: string;
  context?: string;
}

export interface UserProfile {
  name: string;
  bio: string;
  minutesPracticed: number;
  sessionsCompleted: number;
  status: 'online' | 'offline' | 'busy';
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  date: string;
  attendees: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: number;
  tags: string[];
}
