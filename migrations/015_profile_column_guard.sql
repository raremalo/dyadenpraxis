-- Migration 015: Profile Column Guard
-- Adds BEFORE UPDATE trigger that prevents client-side mass assignment of
-- privileged columns. System updates (increment_on_complete from Migration 014)
-- set app.system_update='true' to bypass the guard.

CREATE OR REPLACE FUNCTION prevent_profile_column_tamper()
RETURNS TRIGGER AS $$
DECLARE
  v_is_system_update BOOLEAN := false;
BEGIN
  BEGIN
    v_is_system_update := current_setting('app.system_update', true) = 'true';
  EXCEPTION WHEN OTHERS THEN
    v_is_system_update := false;
  END;

  -- Only enforce when an authenticated user is writing directly.
  -- System updates (increment_on_complete sets app.system_update) bypass.
  -- Service role (auth.uid() IS NULL) bypasses for admin operations.
  IF NOT v_is_system_update AND auth.uid() IS NOT NULL THEN
    NEW.role := OLD.role;
    NEW.trust_level := OLD.trust_level;
    NEW.confirmations := OLD.confirmations;
    NEW.sessions_completed := OLD.sessions_completed;
    NEW.compliance_rate := OLD.compliance_rate;
    NEW.daily_session_limit := OLD.daily_session_limit;
    NEW.monthly_session_limit := OLD.monthly_session_limit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_guard_columns ON profiles;
CREATE TRIGGER profiles_guard_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_column_tamper();

NOTIFY pgrst, 'reload schema';
