-- Fix: Fehlende Realtime Publications fuer profiles, sessions, messages
-- Ohne diese werden postgres_changes Events nicht gesendet
-- subscribeToSession() in useSession.ts braucht Realtime auf sessions

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- bereits vorhanden
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;
