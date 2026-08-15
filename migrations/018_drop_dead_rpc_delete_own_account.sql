-- Migration 018: Drop dead RPC delete_own_account
-- The SECURITY DEFINER function (defined in 007c, section 8.9, granted to
-- authenticated) allowed self-deletion via PostgREST without the password
-- re-auth and avatar/push cleanup that the documented GDPR route
-- /api/delete-account enforces. No client callers remain -- the weaker
-- parallel door is removed.
-- get_user_ratings (007c, section 8.10) is intentionally NOT dropped:
-- the client switched to this RPC (Architecture-Review L6-02).

DROP FUNCTION IF EXISTS delete_own_account();

NOTIFY pgrst, 'reload schema';
