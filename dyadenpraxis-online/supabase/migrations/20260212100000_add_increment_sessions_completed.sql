-- Add RPC function to increment sessions_completed counter for participants
-- Called from useSession.ts completeSession() after a session ends successfully
-- The sessions_completed column already exists in profiles (integer, default 0)

CREATE OR REPLACE FUNCTION public.increment_sessions_completed(user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET sessions_completed = sessions_completed + 1
  WHERE id = ANY(user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sessions_completed(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_sessions_completed(uuid[]) TO service_role;
