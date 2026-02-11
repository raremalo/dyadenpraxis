-- Migration 002: Core Tables (profiles + sessions) + updated_at Trigger
-- Quelle: NEXT_APP_STARTER.md Abschnitt 7.1 + 7.2

-- updated_at Trigger-Funktion
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- profiles Tabelle
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  avatar_url            TEXT,
  bio                   TEXT,
  trust_level           trust_level NOT NULL DEFAULT 'new',
  confirmations         INTEGER NOT NULL DEFAULT 0,
  is_online             BOOLEAN NOT NULL DEFAULT false,
  is_available          BOOLEAN NOT NULL DEFAULT false,
  preferred_levels      INTEGER[] NOT NULL DEFAULT '{1}',
  preferred_duration    INTEGER NOT NULL DEFAULT 15,
  sessions_completed    INTEGER NOT NULL DEFAULT 0,
  compliance_rate       NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  em_experience_months  INTEGER NOT NULL DEFAULT 0
);

-- Indexes fuer profiles
CREATE INDEX idx_profiles_trust_level ON profiles(trust_level);
CREATE INDEX idx_profiles_is_available ON profiles(is_available);
CREATE INDEX idx_profiles_name_trgm ON profiles USING GIN (name gin_trgm_ops);
CREATE INDEX idx_profiles_online_updated ON profiles(is_online, updated_at DESC);
CREATE INDEX idx_profiles_sessions_completed ON profiles(sessions_completed DESC);

-- updated_at Trigger
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- sessions Tabelle
CREATE TABLE sessions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requester_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level                   INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  duration                INTEGER NOT NULL CHECK (duration > 0),
  scheduled_at            TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  status                  session_status NOT NULL DEFAULT 'pending',
  room_url                TEXT,
  room_token              TEXT,
  partner_token           TEXT,
  is_open                 BOOLEAN DEFAULT false,
  third_participant_id    UUID REFERENCES profiles(id),
  third_participant_token TEXT,
  deleted_by_requester    BOOLEAN DEFAULT false,
  deleted_by_partner      BOOLEAN DEFAULT false
);

-- Indexes fuer sessions
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_requester ON sessions(requester_id);
CREATE INDEX idx_sessions_partner ON sessions(partner_id);
CREATE INDEX idx_sessions_is_open ON sessions(is_open) WHERE is_open = true;
CREATE INDEX idx_sessions_third_participant ON sessions(third_participant_id) WHERE third_participant_id IS NOT NULL;
CREATE INDEX idx_sessions_deleted ON sessions(deleted_by_requester, deleted_by_partner);
