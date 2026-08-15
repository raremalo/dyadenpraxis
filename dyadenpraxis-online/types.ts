/**
 * Geteilte Domänen-Typen — single source of truth für Domänen-Vokabular
 * (Architecture-Review L1-01: Hook-lokale Definitionen ziehen hierher).
 */

// --- Dyaden-Session (Timer) ---

export enum DyadRole {
  SPEAKER = 'SPEAKER',
  LISTENER = 'LISTENER',
  CONTEMPLATION = 'CONTEMPLATION',
  TRANSITION = 'TRANSITION',
  COMPLETED = 'COMPLETED',
}

export interface DyadConfig {
  durationMinutes: number;       // Dauer pro Durchgang (Sprechen/Zuhören)
  contemplationMinutes: number;  // Kontemplationszeit
  transitionSeconds: number;     // Wechselpause in Sekunden (0, 10, 20, 30)
  rounds: number;                // Anzahl Runden (1 Runde = 1× Sprechen + 1× Zuhören)
  soundUrl: string;              // Gewählter Klang-URL
}

// --- Gong Timer ---

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

export interface GongEvent {
  type: 'start' | 'stop' | 'complete' | 'repeat';
  timestamp: number;
  config: GongTimerConfig;
}

// --- Trust (3-Tier-System; DB-Enum: migrations/001_init.sql) ---

export type TrustLevel = 'new' | 'known' | 'verified';

// --- Profil (profiles-Tabelle) ---

export interface DbUserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  trust_level: TrustLevel;
  confirmations: number;
  is_online: boolean;
  is_available: boolean;
  preferred_levels: number[];
  preferred_duration: number;
  sessions_completed: number;
  compliance_rate: number;
  em_experience_months: number;
  // Session rate limiting (Migration 012)
  role?: 'user' | 'admin';
  daily_session_limit?: number | null;
  monthly_session_limit?: number | null;
  created_at: string;
  updated_at: string;
}

// --- Dyaden-Prompt (Wire-Format von /api/generate-prompt) ---

export interface DyadPrompt {
  question: string;
  context?: string;
  category?: string;
}
