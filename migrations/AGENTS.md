<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# migrations

## Purpose
Canonical SQL migration sequence for the Supabase PostgreSQL database. Numbered sequentially — each file builds on the previous. These define the complete database schema, RLS policies, RPC functions, and realtime/storage configuration.

## Key Files

| File | Description |
|------|-------------|
| `001_init.sql` | Initial schema setup |
| `002_core_tables.sql` | Core tables — profiles, sessions, etc. |
| `003_feedback_messages.sql` | Feedback and messaging tables |
| `004_verification_blocking.sql` | User verification and blocking system |
| `005_calendar_scheduling.sql` | Calendar and session scheduling |
| `006_invites_push_security.sql` | Invitation system and push notification setup |
| `007a_rpc_trust.sql` | RPC functions for trust/verification |
| `007b_rpc_partners.sql` | RPC functions for partner matching |
| `007c_rpc_sessions_security.sql` | RPC functions for session security |
| `008_rls_policies.sql` | Row-Level Security policies |
| `009_realtime_storage.sql` | Realtime subscriptions and storage buckets |
| `010_auto_profile.sql` | Automatic profile creation trigger |
| `011_rating_disputes.sql` | Rating and dispute resolution system |

## For AI Agents

### Working In This Directory
- NEVER modify existing migration files — always create new ones with the next sequence number
- Migration naming: `NNN_descriptive_name.sql`
- Test migrations locally with `supabase db reset` before committing
- These are the source of truth — `dyadenpraxis-online/supabase/migrations/` contains Supabase CLI-generated copies

### Common Patterns
- RLS policies follow "users can only access their own data" principle
- RPC functions use `security definer` when they need elevated access
- All tables have `created_at` and `updated_at` timestamps

## Dependencies

### Internal
- Applied to Supabase PostgreSQL instance referenced in `dyadenpraxis-online/lib/supabase.ts`
- RPC functions called from hooks in `dyadenpraxis-online/hooks/`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
