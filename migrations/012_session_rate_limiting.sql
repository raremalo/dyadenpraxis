-- Migration 012: Session Rate Limiting
-- Adds app_settings table, profile role/limit columns, 3 SECURITY DEFINER RPCs,
-- admin profile policy, and fixes RLS bug in sessions_update (missing third_participant_id)

-- ============================================================
-- 1. app_settings table (global configuration)
-- ============================================================

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default session limits
INSERT INTO app_settings (key, value) VALUES
  ('session_limits', '{"daily_limit": 5, "monthly_limit": 20}');

-- No direct RLS policies — all access via SECURITY DEFINER RPCs
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Profile columns: role + per-user limits
-- ============================================================

ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
ALTER TABLE profiles ADD COLUMN daily_session_limit INTEGER;
ALTER TABLE profiles ADD COLUMN monthly_session_limit INTEGER;

CREATE INDEX idx_profiles_role ON profiles(role) WHERE role = 'admin';

-- Admin policy: admins can update any profile (OR'd with existing self-update policy)
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 3. RLS fix: sessions_update missing third_participant_id
-- ============================================================

DROP POLICY sessions_update ON sessions;
CREATE POLICY sessions_update ON sessions FOR UPDATE TO authenticated
  USING (
    requester_id = auth.uid()
    OR partner_id = auth.uid()
    OR third_participant_id = auth.uid()
  );

-- ============================================================
-- 4. check_session_limit(p_user_id) -> JSON
-- ============================================================

CREATE OR REPLACE FUNCTION check_session_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_role TEXT;
  v_daily_limit INT;
  v_monthly_limit INT;
  v_daily_count INT;
  v_monthly_count INT;
  v_default_daily INT;
  v_default_monthly INT;
BEGIN
  -- Get user role and per-user limit overrides
  SELECT role, daily_session_limit, monthly_session_limit
    INTO v_role, v_daily_limit, v_monthly_limit
    FROM profiles WHERE id = p_user_id;

  -- Admin bypass: unlimited
  IF v_role = 'admin' THEN
    RETURN json_build_object(
      'allowed', true,
      'daily_count', 0,
      'daily_limit', -1,
      'monthly_count', 0,
      'monthly_limit', -1,
      'limit_type', NULL
    );
  END IF;

  -- Get defaults from app_settings
  SELECT (value->>'daily_limit')::INT, (value->>'monthly_limit')::INT
    INTO v_default_daily, v_default_monthly
    FROM app_settings WHERE key = 'session_limits';

  -- Per-user override > app_settings > hardcoded fallback
  v_daily_limit  := COALESCE(v_daily_limit,  v_default_daily,  5);
  v_monthly_limit := COALESCE(v_monthly_limit, v_default_monthly, 20);

  -- Count sessions today (any participant role, excluding cancelled)
  SELECT COUNT(*) INTO v_daily_count
    FROM sessions
    WHERE (requester_id = p_user_id
            OR partner_id = p_user_id
            OR third_participant_id = p_user_id)
      AND status != 'cancelled'
      AND created_at >= date_trunc('day', NOW());

  -- Count sessions this month
  SELECT COUNT(*) INTO v_monthly_count
    FROM sessions
    WHERE (requester_id = p_user_id
            OR partner_id = p_user_id
            OR third_participant_id = p_user_id)
      AND status != 'cancelled'
      AND created_at >= date_trunc('month', NOW());

  -- Check daily limit first (more restrictive)
  IF v_daily_count >= v_daily_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'daily_count', v_daily_count,
      'daily_limit', v_daily_limit,
      'monthly_count', v_monthly_count,
      'monthly_limit', v_monthly_limit,
      'limit_type', 'daily'
    );
  END IF;

  -- Check monthly limit
  IF v_monthly_count >= v_monthly_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'daily_count', v_daily_count,
      'daily_limit', v_daily_limit,
      'monthly_count', v_monthly_count,
      'monthly_limit', v_monthly_limit,
      'limit_type', 'monthly'
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'daily_count', v_daily_count,
    'daily_limit', v_daily_limit,
    'monthly_count', v_monthly_count,
    'monthly_limit', v_monthly_limit,
    'limit_type', NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_session_limit TO authenticated;

-- ============================================================
-- 5. create_session_limited(...) -> JSON
--    Replaces direct INSERT in useSession.createSession
--    Single-Writer: returns full session with joined profiles
-- ============================================================

CREATE OR REPLACE FUNCTION create_session_limited(
  p_requester_id UUID,
  p_partner_id UUID,
  p_level INT,
  p_duration INT,
  p_is_open BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
  v_limit_check JSON;
  v_session_id UUID;
  v_result JSON;
BEGIN
  -- Enforce rate limit (defense-in-depth, client pre-checks via useCheckSessionLimit)
  SELECT check_session_limit(p_requester_id) INTO v_limit_check;

  IF NOT (v_limit_check->>'allowed')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'session_limit_reached',
      'limit_type', v_limit_check->>'limit_type'
    );
  END IF;

  -- Insert session row
  INSERT INTO sessions (requester_id, partner_id, level, duration, is_open)
    VALUES (p_requester_id, p_partner_id, p_level, p_duration, p_is_open)
    RETURNING id INTO v_session_id;

  -- Return full session with nested profiles (Single-Writer Pattern)
  SELECT json_build_object(
    'success', true,
    'session', json_build_object(
      'id', s.id,
      'created_at', s.created_at,
      'requester_id', s.requester_id,
      'partner_id', s.partner_id,
      'level', s.level,
      'duration', s.duration,
      'scheduled_at', s.scheduled_at,
      'started_at', s.started_at,
      'ended_at', s.ended_at,
      'status', s.status,
      'room_url', s.room_url,
      'room_token', s.room_token,
      'partner_token', s.partner_token,
      'is_open', s.is_open,
      'third_participant_id', s.third_participant_id,
      'third_participant_token', s.third_participant_token,
      'deleted_by_requester', s.deleted_by_requester,
      'deleted_by_partner', s.deleted_by_partner,
      'requester', json_build_object(
        'id', req.id, 'name', req.name, 'avatar_url', req.avatar_url,
        'trust_level', req.trust_level, 'is_online', req.is_online
      ),
      'partner', json_build_object(
        'id', par.id, 'name', par.name, 'avatar_url', par.avatar_url,
        'trust_level', par.trust_level, 'is_online', par.is_online
      )
    )
  ) INTO v_result
  FROM sessions s
  JOIN profiles req ON req.id = s.requester_id
  JOIN profiles par ON par.id = s.partner_id
  WHERE s.id = v_session_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_session_limited TO authenticated;

-- ============================================================
-- 6. join_open_session_limited(p_session_id, p_user_id) -> JSON
--    Unified RPC for partner-slot and third-participant-slot joins
--    Replaces direct UPDATE in useSession.joinOpenSession + joinAsThirdParticipant
-- ============================================================

CREATE OR REPLACE FUNCTION join_open_session_limited(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_limit_check JSON;
  v_session RECORD;
  v_slot TEXT;
  v_is_full BOOLEAN;
BEGIN
  -- Enforce rate limit
  SELECT check_session_limit(p_user_id) INTO v_limit_check;

  IF NOT (v_limit_check->>'allowed')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'session_limit_reached',
      'limit_type', v_limit_check->>'limit_type'
    );
  END IF;

  -- Read current session state
  SELECT * INTO v_session FROM sessions WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;

  -- Partner slot: open dyad waiting for a partner
  IF v_session.status = 'pending' AND v_session.is_open = true THEN
    UPDATE sessions SET
      partner_id = p_user_id,
      is_open = false,
      status = 'accepted'
    WHERE id = p_session_id
      AND is_open = true
      AND status = 'pending';

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'session_already_taken');
    END IF;

    v_slot := 'partner';
    v_is_full := true;

  -- Third participant slot: dyad formed, looking for third
  ELSIF v_session.status IN ('accepted', 'active')
        AND v_session.is_open = true
        AND v_session.third_participant_id IS NULL THEN
    UPDATE sessions SET
      third_participant_id = p_user_id
    WHERE id = p_session_id
      AND is_open = true
      AND third_participant_id IS NULL;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'slot_already_taken');
    END IF;

    v_slot := 'third';
    v_is_full := true;

  ELSE
    RETURN json_build_object('success', false, 'error', 'no_available_slot');
  END IF;

  RETURN json_build_object(
    'success', true,
    'slot', v_slot,
    'is_full', v_is_full
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_open_session_limited TO authenticated;
