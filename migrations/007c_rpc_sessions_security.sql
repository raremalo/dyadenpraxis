-- Migration 007c: Sessions + Security + Invitations + GDPR + Ratings
-- Quelle: NEXT_APP_STARTER.md Abschnitt 8.6 - 8.10

-- 8.6 Offene Sessions
CREATE OR REPLACE FUNCTION get_open_sessions(user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, created_at TIMESTAMPTZ, requester_id UUID,
  requester_name TEXT, requester_avatar TEXT,
  level INT, duration INT, scheduled_at TIMESTAMPTZ, status session_status
)
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at, s.requester_id,
    p.name, p.avatar_url,
    s.level, s.duration, s.scheduled_at, s.status
  FROM sessions s
  JOIN profiles p ON p.id = s.requester_id
  WHERE s.is_open = true AND s.status = 'pending'
    AND (user_id IS NULL OR s.requester_id != user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_open_sessions TO authenticated;

-- 8.7 Rate Limiting
CREATE OR REPLACE FUNCTION check_login_rate_limit(
  p_ip_hash TEXT, p_email_hash TEXT,
  p_max_attempts INT DEFAULT 5, p_window_minutes INT DEFAULT 15
)
RETURNS JSON AS $$
DECLARE
  ip_count INT; email_count INT; time_window INTERVAL;
BEGIN
  time_window := (p_window_minutes || ' minutes')::INTERVAL;
  SELECT COUNT(*) INTO ip_count FROM login_attempts
    WHERE ip_hash = p_ip_hash AND attempted_at > NOW() - time_window AND NOT success;
  SELECT COUNT(*) INTO email_count FROM login_attempts
    WHERE email_hash = p_email_hash AND attempted_at > NOW() - time_window AND NOT success;

  RETURN json_build_object(
    'allowed', ip_count < p_max_attempts AND email_count < p_max_attempts,
    'ip_attempts', ip_count, 'email_attempts', email_count,
    'max_attempts', p_max_attempts,
    'retry_after', EXTRACT(EPOCH FROM (time_window - LEAST(
      NOW() - (SELECT MAX(attempted_at) FROM login_attempts WHERE ip_hash = p_ip_hash AND NOT success),
      NOW() - (SELECT MAX(attempted_at) FROM login_attempts WHERE email_hash = p_email_hash AND NOT success)
    )))::INT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_login_attempt(p_ip_hash TEXT, p_email_hash TEXT, p_success BOOLEAN)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (ip_hash, email_hash, success) VALUES (p_ip_hash, p_email_hash, p_success);
  IF p_success THEN
    DELETE FROM login_attempts WHERE email_hash = p_email_hash AND NOT success;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INT AS $$
DECLARE deleted INT;
BEGIN
  DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.8 Einladungen
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE (id UUID, inviter_id UUID, inviter_name TEXT, inviter_avatar TEXT, expires_at TIMESTAMPTZ, is_valid BOOLEAN)
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.inviter_id, p.name, p.avatar_url, i.expires_at,
    (i.is_active AND i.used_at IS NULL AND i.expires_at > NOW()) AS is_valid
  FROM invitations i
  JOIN profiles p ON p.id = i.inviter_id
  WHERE i.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_invitation_token TO anon, authenticated;

CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS VARCHAR(32) AS $$
DECLARE chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR(32) := '';
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_invite_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM invitations WHERE inviter_id = NEW.inviter_id AND is_active AND used_at IS NULL AND expires_at > NOW()) >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 aktive Einladungen erreicht';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_invite_limit ON invitations;
CREATE TRIGGER enforce_invite_limit BEFORE INSERT ON invitations FOR EACH ROW EXECUTE FUNCTION check_invite_limit();

-- 8.9 Account-Loeschung (GDPR)
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_own_account TO authenticated;

-- 8.10 User Ratings
CREATE OR REPLACE FUNCTION get_user_ratings(p_user_id UUID)
RETURNS TABLE (
  average_rating NUMERIC, rating_count BIGINT,
  structure_avg NUMERIC, presence_avg NUMERIC, overall_avg NUMERIC,
  would_practice_again_percent NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG((sf.structure_rating + sf.presence_rating + sf.overall_rating)::NUMERIC / 3), 1),
    COUNT(*),
    ROUND(AVG(sf.structure_rating::NUMERIC), 1),
    ROUND(AVG(sf.presence_rating::NUMERIC), 1),
    ROUND(AVG(sf.overall_rating::NUMERIC), 1),
    ROUND(AVG(CASE WHEN sf.would_practice_again THEN 100 ELSE 0 END)::NUMERIC, 0)
  FROM session_feedback sf
  WHERE sf.rated_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
