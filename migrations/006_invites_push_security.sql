-- Migration 006: Invitations + Push + Security + Legacy
-- Quelle: NEXT_APP_STARTER.md Abschnitt 7.5, 7.10, 7.11, 7.12, 7.13

CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  inviter_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token           VARCHAR(32) UNIQUE NOT NULL,
  used_at         TIMESTAMPTZ,
  invited_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN DEFAULT true
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_inviter ON invitations(inviter_id);

CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

CREATE TRIGGER push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash      TEXT NOT NULL,
  email_hash   TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_hash, attempted_at DESC);
CREATE INDEX idx_login_attempts_email_time ON login_attempts(email_hash, attempted_at DESC);
CREATE INDEX idx_login_attempts_cleanup ON login_attempts(attempted_at);

CREATE TABLE feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_rules  BOOLEAN NOT NULL,
  trust_confirmed BOOLEAN,
  private_note    TEXT,
  block_partner   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (session_id, reviewer_id)
);

CREATE TABLE rating_disputes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispute_type     TEXT NOT NULL CHECK (dispute_type IN ('rating','verification','other')),
  reporter_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  disputed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id       UUID REFERENCES sessions(id) ON DELETE SET NULL,
  verification_id  UUID REFERENCES peer_verifications(id) ON DELETE SET NULL,
  description      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','investigating','resolved','dismissed')),
  resolution       TEXT,
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT
);

CREATE INDEX idx_rating_disputes_reporter ON rating_disputes(reporter_id);
CREATE INDEX idx_rating_disputes_status ON rating_disputes(status);
