-- Migration 005: Calendar + Scheduling
-- Quelle: NEXT_APP_STARTER.md Abschnitt 7.8 + 7.9

CREATE TABLE availability_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_user ON availability_slots(user_id);
CREATE INDEX idx_availability_day ON availability_slots(day_of_week);

CREATE TRIGGER availability_slots_updated_at BEFORE UPDATE ON availability_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE scheduled_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id            UUID REFERENCES sessions(id) ON DELETE CASCADE,
  requester_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_for         TIMESTAMPTZ NOT NULL,
  duration              INTEGER NOT NULL DEFAULT 15,
  level                 INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  status                VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('proposed','scheduled','cancelled','completed','rejected')),
  reminder_sent         BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT,
  message               TEXT,
  pending_response_from UUID REFERENCES profiles(id)
);

CREATE INDEX idx_scheduled_sessions_requester ON scheduled_sessions(requester_id);
CREATE INDEX idx_scheduled_sessions_partner ON scheduled_sessions(partner_id);
CREATE INDEX idx_scheduled_sessions_date ON scheduled_sessions(scheduled_for);
CREATE INDEX idx_scheduled_sessions_status ON scheduled_sessions(status);
CREATE INDEX idx_scheduled_sessions_pending ON scheduled_sessions(pending_response_from) WHERE status = 'proposed';

CREATE TRIGGER scheduled_sessions_updated_at BEFORE UPDATE ON scheduled_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
