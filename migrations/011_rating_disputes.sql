-- Migration 011: Rating Disputes RLS Policies
-- RLS und zusaetzlicher Index fuer rating_disputes Tabelle (Tabelle bereits in 006)

-- Zusaetzlicher Index fuer gemeldete User
CREATE INDEX IF NOT EXISTS idx_rating_disputes_disputed ON rating_disputes(disputed_user_id);

-- Row Level Security aktivieren
ALTER TABLE rating_disputes ENABLE ROW LEVEL SECURITY;

-- SELECT: User kann eigene Meldungen und gegen sich gerichtete Meldungen sehen
CREATE POLICY "Users can view own disputes"
  ON rating_disputes FOR SELECT
  USING (
    auth.uid() = reporter_id OR auth.uid() = disputed_user_id
  );

-- INSERT: User kann Meldungen erstellen (aber nicht gegen sich selbst)
CREATE POLICY "Users can create disputes"
  ON rating_disputes FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id AND auth.uid() != disputed_user_id
  );

-- UPDATE/DELETE: Nur fuer zukuenftige Admin-Funktionalitaet vorgesehen
-- Aktuell keine Policy - Updates nur via Service Role moeglich
