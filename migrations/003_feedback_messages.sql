-- Migration 003: Feedback + Messages
-- Quelle: NEXT_APP_STARTER.md Abschnitt 7.3 + 7.4

CREATE TABLE session_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rated_user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  structure_rating      INT NOT NULL CHECK (structure_rating BETWEEN 1 AND 5),
  presence_rating       INT NOT NULL CHECK (presence_rating BETWEEN 1 AND 5),
  overall_rating        INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  would_practice_again  BOOLEAN NOT NULL,
  UNIQUE (session_id, reviewer_id)
);

CREATE INDEX idx_feedback_rated_user ON session_feedback(rated_user_id);
CREATE INDEX idx_feedback_session ON session_feedback(session_id);

CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  read_at      TIMESTAMPTZ
);

CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);
