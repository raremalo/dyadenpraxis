-- Migration 007: RPC Functions
-- Quelle: NEXT_APP_STARTER.md Abschnitt 8.1 - 8.11

-- 8.1 Trust-Level System
CREATE OR REPLACE FUNCTION recalculate_trust_level(user_id UUID)
RETURNS void AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM peer_verifications pv
  JOIN profiles p ON p.id = pv.verifier_id
  WHERE pv.verified_user_id = user_id
    AND pv.is_active = true
    AND p.trust_level = 'verified';

  UPDATE profiles SET
    trust_level = CASE
      WHEN active_count >= 3 THEN 'verified'::trust_level
      WHEN active_count >= 1 THEN 'known'::trust_level
      ELSE 'new'::trust_level
    END,
    confirmations = active_count
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION on_verification_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_trust_level(OLD.verified_user_id);
  ELSE
    PERFORM recalculate_trust_level(NEW.verified_user_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS peer_verifications_recalculate ON peer_verifications;
CREATE TRIGGER peer_verifications_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON peer_verifications
  FOR EACH ROW EXECUTE FUNCTION on_verification_change();

-- 8.2 Verifizierer abrufen
CREATE OR REPLACE FUNCTION get_verifiers(target_user_id UUID)
RETURNS TABLE (id UUID, name TEXT, avatar_url TEXT, verified_at TIMESTAMPTZ)
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, pv.created_at AS verified_at
  FROM peer_verifications pv
  JOIN profiles p ON p.id = pv.verifier_id
  WHERE pv.verified_user_id = target_user_id AND pv.is_active = true
  ORDER BY pv.created_at DESC LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.3 Verification Stats
CREATE OR REPLACE FUNCTION get_verification_stats(target_user_id UUID)
RETURNS TABLE (verification_count INTEGER, is_verified BOOLEAN, trust_level trust_level)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM peer_verifications WHERE verified_user_id = target_user_id AND is_active = true),
    (SELECT p.trust_level = 'verified' FROM profiles p WHERE p.id = target_user_id),
    (SELECT p.trust_level FROM profiles p WHERE p.id = target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
