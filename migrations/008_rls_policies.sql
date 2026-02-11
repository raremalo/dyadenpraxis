-- Migration 008: RLS Policies fuer alle 13 Tabellen
-- Quelle: NEXT_APP_STARTER.md Abschnitt 9

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_disputes ENABLE ROW LEVEL SECURITY;

-- profiles: Jeder Auth-User kann Profile sehen, nur eigenes bearbeiten
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- sessions: Nur Teilnehmer sehen/bearbeiten
CREATE POLICY sessions_select ON sessions FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR partner_id = auth.uid() OR third_participant_id = auth.uid());
CREATE POLICY sessions_insert ON sessions FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY sessions_update ON sessions FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR partner_id = auth.uid());

-- session_feedback: Nur eigene Reviews sehen, nur fuer eigene Sessions erstellen
CREATE POLICY session_feedback_select ON session_feedback FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR rated_user_id = auth.uid());
CREATE POLICY session_feedback_insert ON session_feedback FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- messages: Nur Sender/Empfaenger
CREATE POLICY messages_select ON messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY messages_update ON messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- invitations: Eigene Einladungen verwalten
CREATE POLICY invitations_select ON invitations FOR SELECT TO authenticated
  USING (inviter_id = auth.uid());
CREATE POLICY invitations_insert ON invitations FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid());
CREATE POLICY invitations_update ON invitations FOR UPDATE TO authenticated
  USING (inviter_id = auth.uid());

-- peer_verifications: Alle sehen, nur eigene erstellen
CREATE POLICY peer_verifications_select ON peer_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY peer_verifications_insert ON peer_verifications FOR INSERT TO authenticated
  WITH CHECK (verifier_id = auth.uid());
CREATE POLICY peer_verifications_update ON peer_verifications FOR UPDATE TO authenticated
  USING (verifier_id = auth.uid());
CREATE POLICY peer_verifications_delete ON peer_verifications FOR DELETE TO authenticated
  USING (verifier_id = auth.uid());

-- blocked_partners: Nur eigene Blockierungen
CREATE POLICY blocked_partners_select ON blocked_partners FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY blocked_partners_insert ON blocked_partners FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY blocked_partners_delete ON blocked_partners FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- availability_slots: Eigene Slots verwalten, alle sehen
CREATE POLICY availability_slots_select ON availability_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY availability_slots_insert ON availability_slots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY availability_slots_update ON availability_slots FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY availability_slots_delete ON availability_slots FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- scheduled_sessions: Nur Teilnehmer
CREATE POLICY scheduled_sessions_select ON scheduled_sessions FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR partner_id = auth.uid());
CREATE POLICY scheduled_sessions_insert ON scheduled_sessions FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY scheduled_sessions_update ON scheduled_sessions FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR partner_id = auth.uid());

-- push_subscriptions: Nur eigene
CREATE POLICY push_subscriptions_select ON push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY push_subscriptions_update ON push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY push_subscriptions_delete ON push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- login_attempts: Kein direkter Zugriff (nur via RPC)
-- Keine SELECT/INSERT Policies fuer anon/authenticated - alles via SECURITY DEFINER RPCs

-- feedback: Nur Teilnehmer
CREATE POLICY feedback_select ON feedback FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR reviewed_id = auth.uid());
CREATE POLICY feedback_insert ON feedback FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- rating_disputes: Nur eigene Reports
CREATE POLICY rating_disputes_select ON rating_disputes FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());
CREATE POLICY rating_disputes_insert ON rating_disputes FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
