-- Migration 016: submit_session_feedback RPC
-- SECURITY DEFINER RPC that validates feedback submission server-side.
-- Replaces the unguarded direct INSERT in useFeedback.submitFeedback.

CREATE OR REPLACE FUNCTION submit_session_feedback(
  p_session_id UUID,
  p_rated_user_id UUID,
  p_structure_rating INT,
  p_presence_rating INT,
  p_overall_rating INT,
  p_would_practice_again BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_existing UUID;
  v_inserted RECORD;
BEGIN
  -- Validate ratings range
  IF p_structure_rating < 1 OR p_structure_rating > 5 OR
     p_presence_rating < 1 OR p_presence_rating > 5 OR
     p_overall_rating < 1 OR p_overall_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_rating');
  END IF;

  -- Load session
  SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'session_not_found');
  END IF;

  -- Validate session is completed
  IF v_session.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'session_not_completed');
  END IF;

  -- Validate reviewer (auth.uid()) is a participant
  IF auth.uid() IS DISTINCT FROM v_session.requester_id
     AND auth.uid() IS DISTINCT FROM v_session.partner_id
     AND (v_session.third_participant_id IS NULL OR
          auth.uid() IS DISTINCT FROM v_session.third_participant_id) THEN
    RETURN json_build_object('success', false, 'error', 'not_participant');
  END IF;

  -- Validate rated_user is a co-participant
  IF p_rated_user_id IS DISTINCT FROM v_session.requester_id
     AND p_rated_user_id IS DISTINCT FROM v_session.partner_id
     AND (v_session.third_participant_id IS NULL OR
          p_rated_user_id IS DISTINCT FROM v_session.third_participant_id) THEN
    RETURN json_build_object('success', false, 'error', 'rated_user_not_participant');
  END IF;

  -- Validate reviewer != rated_user
  IF auth.uid() = p_rated_user_id THEN
    RETURN json_build_object('success', false, 'error', 'cannot_rate_self');
  END IF;

  -- Check for existing feedback (duplicate)
  -- Probe muss mit UNIQUE-Constraint (session_id, reviewer_id) aus Migration 003 übereinstimmen.
  -- Ohne rated_user_id im Probe → korrekte already_rated-Meldung statt raw 23505 bei Triaden.
  SELECT id INTO v_existing FROM session_feedback
  WHERE session_id = p_session_id
    AND reviewer_id = auth.uid();

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_rated');
  END IF;

  -- Insert feedback, return the inserted row
  INSERT INTO session_feedback (
    session_id, rated_user_id, reviewer_id,
    structure_rating, presence_rating, overall_rating, would_practice_again
  ) VALUES (
    p_session_id, p_rated_user_id, auth.uid(),
    p_structure_rating, p_presence_rating, p_overall_rating, p_would_practice_again
  )
  RETURNING * INTO v_inserted;

  RETURN json_build_object('success', true, 'feedback', row_to_json(v_inserted));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_session_feedback TO authenticated;

NOTIFY pgrst, 'reload schema';
