-- Migration: RLS Policies fuer Kerntabellen (profiles, sessions, messages, session_feedback)
-- Diese Tabellen hatten KEIN RLS aktiviert - SICHERHEITSKRITISCH

-- 1. Enable RLS on core tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. profiles: Jeder Auth-User kann Profile sehen, nur eigenes bearbeiten
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- 3. sessions: Nur Teilnehmer sehen/bearbeiten, offene Sessions fuer alle sichtbar
CREATE POLICY sessions_select ON sessions FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid() 
    OR partner_id = auth.uid() 
    OR third_participant_id = auth.uid()
    OR is_open = true
  );
CREATE POLICY sessions_insert ON sessions FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY sessions_update ON sessions FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR partner_id = auth.uid() OR third_participant_id = auth.uid());

-- 4. session_feedback: Nur eigene Reviews sehen, nur fuer eigene Sessions erstellen
CREATE POLICY session_feedback_select ON session_feedback FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR rated_user_id = auth.uid());
CREATE POLICY session_feedback_insert ON session_feedback FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- 5. messages: Nur Sender/Empfaenger, nicht an geblockte User
CREATE POLICY messages_select ON messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM blocked_partners 
      WHERE (user_id = recipient_id AND blocked_user_id = auth.uid())
         OR (user_id = auth.uid() AND blocked_user_id = recipient_id)
    )
  );
CREATE POLICY messages_update ON messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()); -- Nur Empfaenger kann read_at setzen
