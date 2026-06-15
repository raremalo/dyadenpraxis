-- Migration 014: RPC Identity Guards (Security)
-- Adds auth.uid() assertions to SECURITY DEFINER RPCs that accepted client-supplied
-- identity UUIDs without verification. Replaces increment_sessions_completed RPC
-- with an AFTER UPDATE trigger. Adds WITH CHECK to sessions_update policy.
--
-- Root cause (M1 principle): SECURITY DEFINER bypasses RLS, so client-supplied
-- identity parameters are the sole trust boundary — and they were absent.

-- ============================================================
-- 1. check_session_limit: add auth.uid() assertion
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
  -- M1 Guard: caller must query their own session limit
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'identity_mismatch: cannot query another user''s session limit';
  END IF;

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

-- ============================================================
-- 2. create_session_limited: add auth.uid() assertion
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
  -- M1 Guard: caller must create sessions as themselves
  IF p_requester_id <> auth.uid() THEN
    RAISE EXCEPTION 'identity_mismatch: cannot create sessions as another user';
  END IF;

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

-- ============================================================
-- 3. join_open_session_limited: add auth.uid() assertion
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
  -- M1 Guard: caller must join sessions as themselves
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'identity_mismatch: cannot join sessions as another user';
  END IF;

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

-- ============================================================
-- 4. Replace increment_sessions_completed RPC with AFTER UPDATE trigger
-- ============================================================

-- Drop the old vulnerable RPC (blindly incremented arbitrary user_ids)
DROP FUNCTION IF EXISTS increment_sessions_completed(uuid[]);

-- Trigger function: increments sessions_completed for all participants
-- when a session transitions to 'completed'. Replaces the client-side RPC call.
CREATE OR REPLACE FUNCTION increment_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire on actual completion transition (not accepted→active etc.)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- SECURITY DEFINER: bypasses RLS so we can update ALL participants' profiles.
    -- set_config: marks this as a system update so the Phase 2 column guard
    -- (Migration 015: prevent_profile_column_tamper) doesn't reset sessions_completed.
    -- WICHTIG: 'true' als 3. Parameter = transaction-local. Der Column-Guard
    -- (prevent_profile_column_tamper, Migration 015) MUSS im selben Transaction-Frame
    -- laufen. Ein innerer BEGIN/EXCEPTION-Block würde den GUC-Scope brechen.
    PERFORM set_config('app.system_update', 'true', true);
    UPDATE profiles
    SET sessions_completed = sessions_completed + 1
    WHERE id IN (NEW.requester_id, NEW.partner_id, NEW.third_participant_id)
      AND id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sessions_complete_increment
  AFTER UPDATE OF status ON sessions
  FOR EACH ROW EXECUTE FUNCTION increment_on_complete();

-- ============================================================
-- 5. sessions_update: add WITH CHECK (prevent participant-ID tampering)
-- ============================================================

DROP POLICY IF EXISTS sessions_update ON sessions;
CREATE POLICY sessions_update ON sessions FOR UPDATE TO authenticated
  USING (
    requester_id = auth.uid()
    OR partner_id = auth.uid()
    OR third_participant_id = auth.uid()
  )
  WITH CHECK (
    requester_id = auth.uid()
    OR partner_id = auth.uid()
    OR third_participant_id = auth.uid()
  );

-- Refresh PostgREST schema cache so the API sees updated function signatures
NOTIFY pgrst, 'reload schema';
