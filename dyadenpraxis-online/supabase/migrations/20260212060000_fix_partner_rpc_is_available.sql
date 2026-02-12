-- Fix: is_available in get_recommended_partners und get_recent_partners ergaenzen
-- Ohne is_available zeigt PartnerCard immer "beschaeftigt" statt "online"
-- DROP noetig weil sich der RETURNS TABLE aendert (neues OUT-Feld is_available)

DROP FUNCTION IF EXISTS get_recommended_partners(UUID, INT);
DROP FUNCTION IF EXISTS get_recent_partners(UUID, INT);

CREATE OR REPLACE FUNCTION get_recommended_partners(p_user_id UUID, lim INT DEFAULT 6)
RETURNS TABLE (
  id UUID, name TEXT, avatar_url TEXT, bio TEXT, trust_level trust_level,
  confirmations INT, is_online BOOLEAN, is_available BOOLEAN, preferred_levels INT[],
  preferred_duration INT, sessions_completed INT, compliance_rate NUMERIC,
  em_experience_months INT, updated_at TIMESTAMPTZ,
  match_score NUMERIC, match_reasons TEXT[]
)
AS $$
DECLARE
  user_levels INT[];
  user_duration INT;
  user_exp INT;
BEGIN
  SELECT p.preferred_levels, p.preferred_duration, p.em_experience_months
  INTO user_levels, user_duration, user_exp
  FROM profiles p WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.trust_level,
    p.confirmations, p.is_online, p.is_available, p.preferred_levels,
    p.preferred_duration, p.sessions_completed, p.compliance_rate,
    p.em_experience_months, p.updated_at,
    (
      CASE WHEN p.preferred_levels && user_levels THEN 3 ELSE 0 END +
      CASE WHEN p.preferred_duration = user_duration THEN 2 ELSE 0 END +
      CASE WHEN EXISTS(SELECT 1 FROM session_feedback sf WHERE sf.rated_user_id = p_user_id AND sf.reviewer_id = p.id AND sf.would_practice_again) THEN 2 ELSE 0 END +
      CASE WHEN ABS(p.em_experience_months - user_exp) <= 6 THEN 1 ELSE 0 END +
      CASE WHEN p.trust_level = 'verified' THEN 1 ELSE 0 END +
      CASE WHEN p.is_online THEN 0.5 ELSE 0 END
    )::NUMERIC AS score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN p.preferred_levels && user_levels THEN 'shared_levels' END,
      CASE WHEN p.preferred_duration = user_duration THEN 'same_duration' END,
      CASE WHEN p.trust_level = 'verified' THEN 'verified' END,
      CASE WHEN p.is_online THEN 'online' END
    ], NULL) AS reasons
  FROM profiles p
  LEFT JOIN blocked_partners bp1 ON bp1.user_id = p_user_id AND bp1.blocked_user_id = p.id
  LEFT JOIN blocked_partners bp2 ON bp2.user_id = p.id AND bp2.blocked_user_id = p_user_id
  WHERE p.id != p_user_id AND bp1.id IS NULL AND bp2.id IS NULL
  ORDER BY score DESC, p.updated_at DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION get_recommended_partners FROM anon;
GRANT EXECUTE ON FUNCTION get_recommended_partners TO authenticated;

CREATE OR REPLACE FUNCTION get_recent_partners(p_user_id UUID, lim INT DEFAULT 6)
RETURNS TABLE (
  id UUID, name TEXT, avatar_url TEXT, bio TEXT, trust_level trust_level,
  confirmations INT, is_online BOOLEAN, is_available BOOLEAN, preferred_levels INT[],
  preferred_duration INT, sessions_completed INT, compliance_rate NUMERIC,
  updated_at TIMESTAMPTZ, last_session_at TIMESTAMPTZ
)
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (partner.id) partner.id, partner.name, partner.avatar_url, partner.bio,
    partner.trust_level, partner.confirmations, partner.is_online, partner.is_available,
    partner.preferred_levels, partner.preferred_duration, partner.sessions_completed,
    partner.compliance_rate, partner.updated_at, s.created_at AS last_session_at
  FROM sessions s
  JOIN profiles partner ON partner.id = CASE
    WHEN s.requester_id = p_user_id THEN s.partner_id
    ELSE s.requester_id
  END
  WHERE (s.requester_id = p_user_id OR s.partner_id = p_user_id)
    AND s.status IN ('completed', 'active', 'accepted')
  ORDER BY partner.id, s.created_at DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION get_recent_partners FROM anon;
GRANT EXECUTE ON FUNCTION get_recent_partners TO authenticated;
