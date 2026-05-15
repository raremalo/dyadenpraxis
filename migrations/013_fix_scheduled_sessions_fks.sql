-- Migration 013: Fix FK constraints on scheduled_sessions for PostgREST joins
-- Problem: scheduled_sessions.requester_id and partner_id FKs to profiles
--          are missing, causing PGRST200 on join queries

-- Check and add missing FK constraints
DO $$
BEGIN
  -- Add FK for requester_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'scheduled_sessions'::regclass 
    AND conname = 'scheduled_sessions_requester_id_fkey'
  ) THEN
    ALTER TABLE scheduled_sessions 
    ADD CONSTRAINT scheduled_sessions_requester_id_fkey 
    FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add FK for partner_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'scheduled_sessions'::regclass 
    AND conname = 'scheduled_sessions_partner_id_fkey'
  ) THEN
    ALTER TABLE scheduled_sessions 
    ADD CONSTRAINT scheduled_sessions_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add FK for pending_response_from if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'scheduled_sessions'::regclass 
    AND conname = 'scheduled_sessions_pending_response_from_fkey'
  ) THEN
    ALTER TABLE scheduled_sessions 
    ADD CONSTRAINT scheduled_sessions_pending_response_from_fkey 
    FOREIGN KEY (pending_response_from) REFERENCES profiles(id);
  END IF;

  -- Add FK for session_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'scheduled_sessions'::regclass 
    AND conname = 'scheduled_sessions_session_id_fkey'
  ) THEN
    ALTER TABLE scheduled_sessions 
    ADD CONSTRAINT scheduled_sessions_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;

  -- Fix availability_slots FK if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'availability_slots'::regclass 
    AND conname = 'availability_slots_user_id_fkey'
  ) THEN
    ALTER TABLE availability_slots 
    ADD CONSTRAINT availability_slots_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
