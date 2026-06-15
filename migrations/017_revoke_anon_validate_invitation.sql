-- Migration 017: Revoke anon access to validate_invitation_token
-- Only authenticated users may validate invitation tokens.
-- Reduces token-enumeration surface (L6-06).

REVOKE EXECUTE ON FUNCTION validate_invitation_token(TEXT) FROM anon;

NOTIFY pgrst, 'reload schema';
