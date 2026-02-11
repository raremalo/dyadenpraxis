-- Migration 009: Realtime Publication + Storage
-- Quelle: NEXT_APP_STARTER.md Abschnitt 10, 19

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE peer_verifications;

-- Storage Bucket fuer Avatare
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Upload nur eigener Ordner
CREATE POLICY avatars_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY avatars_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY avatars_public_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
