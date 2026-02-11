-- Migration 004: Verification + Blocking
-- Quelle: NEXT_APP_STARTER.md Abschnitt 7.6 + 7.7

CREATE TABLE peer_verifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verifier_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verified_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id       UUID REFERENCES sessions(id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (verifier_id, verified_user_id),
  CHECK (verifier_id != verified_user_id)
);

CREATE INDEX idx_peer_verifications_verified_user ON peer_verifications(verified_user_id);
CREATE INDEX idx_peer_verifications_verifier ON peer_verifications(verifier_id);
CREATE INDEX idx_peer_verifications_active ON peer_verifications(is_active);

CREATE TABLE blocked_partners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (user_id, blocked_user_id)
);
