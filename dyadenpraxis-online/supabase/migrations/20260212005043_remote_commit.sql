


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."session_status" AS ENUM (
    'pending',
    'accepted',
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."session_status" OWNER TO "postgres";


CREATE TYPE "public"."trust_level" AS ENUM (
    'new',
    'known',
    'verified'
);


ALTER TYPE "public"."trust_level" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_invite_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (SELECT COUNT(*) FROM invitations WHERE inviter_id = NEW.inviter_id AND is_active AND used_at IS NULL AND expires_at > NOW()) >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 aktive Einladungen erreicht';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_invite_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_login_rate_limit"("p_ip_hash" "text", "p_email_hash" "text", "p_max_attempts" integer DEFAULT 5, "p_window_minutes" integer DEFAULT 15) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  ip_count INT; email_count INT; time_window INTERVAL;
BEGIN
  time_window := (p_window_minutes || ' minutes')::INTERVAL;
  SELECT COUNT(*) INTO ip_count FROM login_attempts
    WHERE ip_hash = p_ip_hash AND attempted_at > NOW() - time_window AND NOT success;
  SELECT COUNT(*) INTO email_count FROM login_attempts
    WHERE email_hash = p_email_hash AND attempted_at > NOW() - time_window AND NOT success;

  RETURN json_build_object(
    'allowed', ip_count < p_max_attempts AND email_count < p_max_attempts,
    'ip_attempts', ip_count, 'email_attempts', email_count,
    'max_attempts', p_max_attempts,
    'retry_after', EXTRACT(EPOCH FROM (time_window - LEAST(
      NOW() - (SELECT MAX(attempted_at) FROM login_attempts WHERE ip_hash = p_ip_hash AND NOT success),
      NOW() - (SELECT MAX(attempted_at) FROM login_attempts WHERE email_hash = p_email_hash AND NOT success)
    )))::INT
  );
END;
$$;


ALTER FUNCTION "public"."check_login_rate_limit"("p_ip_hash" "text", "p_email_hash" "text", "p_max_attempts" integer, "p_window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_login_attempts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE deleted INT;
BEGIN
  DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_login_attempts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_own_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."delete_own_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_token"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR(32) := '';
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_invite_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_open_sessions"("user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "requester_id" "uuid", "requester_name" "text", "requester_avatar" "text", "level" integer, "duration" integer, "scheduled_at" timestamp with time zone, "status" "public"."session_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at, s.requester_id,
    p.name, p.avatar_url,
    s.level, s.duration, s.scheduled_at, s.status
  FROM sessions s
  JOIN profiles p ON p.id = s.requester_id
  WHERE s.is_open = true AND s.status = 'pending'
    AND (user_id IS NULL OR s.requester_id != user_id);
END;
$$;


ALTER FUNCTION "public"."get_open_sessions"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_partners"("p_user_id" "uuid", "lim" integer DEFAULT 6) RETURNS TABLE("id" "uuid", "name" "text", "avatar_url" "text", "bio" "text", "trust_level" "public"."trust_level", "confirmations" integer, "is_online" boolean, "preferred_levels" integer[], "preferred_duration" integer, "sessions_completed" integer, "compliance_rate" numeric, "updated_at" timestamp with time zone, "last_session_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (partner.id) partner.id, partner.name, partner.avatar_url, partner.bio,
    partner.trust_level, partner.confirmations, partner.is_online,
    partner.preferred_levels, partner.preferred_duration, partner.sessions_completed,
    partner.compliance_rate, partner.updated_at, s.created_at AS last_session_at
  FROM sessions s
  JOIN profiles partner ON partner.id = CASE
    WHEN s.requester_id = p_user_id THEN s.partner_id
    ELSE s.requester_id
  END
  WHERE (s.requester_id = p_user_id OR s.partner_id = p_user_id)
    AND s.status IN ('completed', 'active', 'accepted')
  ORDER BY partner.id, s.created_at DESC
  LIMIT lim;
END;
$$;


ALTER FUNCTION "public"."get_recent_partners"("p_user_id" "uuid", "lim" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommended_partners"("p_user_id" "uuid", "lim" integer DEFAULT 6) RETURNS TABLE("id" "uuid", "name" "text", "avatar_url" "text", "bio" "text", "trust_level" "public"."trust_level", "confirmations" integer, "is_online" boolean, "preferred_levels" integer[], "preferred_duration" integer, "sessions_completed" integer, "compliance_rate" numeric, "em_experience_months" integer, "updated_at" timestamp with time zone, "match_score" numeric, "match_reasons" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_levels INT[];
  user_duration INT;
  user_exp INT;
BEGIN
  SELECT p.preferred_levels, p.preferred_duration, p.em_experience_months
  INTO user_levels, user_duration, user_exp
  FROM profiles p WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.trust_level,
    p.confirmations, p.is_online, p.preferred_levels,
    p.preferred_duration, p.sessions_completed, p.compliance_rate,
    p.em_experience_months, p.updated_at,
    (
      CASE WHEN p.preferred_levels && user_levels THEN 3 ELSE 0 END +
      CASE WHEN p.preferred_duration = user_duration THEN 2 ELSE 0 END +
      CASE WHEN EXISTS(SELECT 1 FROM session_feedback sf WHERE sf.rated_user_id = p_user_id AND sf.reviewer_id = p.id AND sf.would_practice_again) THEN 2 ELSE 0 END +
      CASE WHEN ABS(p.em_experience_months - user_exp) <= 6 THEN 1 ELSE 0 END +
      CASE WHEN p.trust_level = 'verified' THEN 1 ELSE 0 END +
      CASE WHEN p.is_online THEN 0.5 ELSE 0 END
    )::NUMERIC AS score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN p.preferred_levels && user_levels THEN 'shared_levels' END,
      CASE WHEN p.preferred_duration = user_duration THEN 'same_duration' END,
      CASE WHEN p.trust_level = 'verified' THEN 'verified' END,
      CASE WHEN p.is_online THEN 'online' END
    ], NULL) AS reasons
  FROM profiles p
  LEFT JOIN blocked_partners bp1 ON bp1.user_id = p_user_id AND bp1.blocked_user_id = p.id
  LEFT JOIN blocked_partners bp2 ON bp2.user_id = p.id AND bp2.blocked_user_id = p_user_id
  WHERE p.id != p_user_id AND bp1.id IS NULL AND bp2.id IS NULL
  ORDER BY score DESC, p.updated_at DESC
  LIMIT lim;
END;
$$;


ALTER FUNCTION "public"."get_recommended_partners"("p_user_id" "uuid", "lim" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_ratings"("p_user_id" "uuid") RETURNS TABLE("average_rating" numeric, "rating_count" bigint, "structure_avg" numeric, "presence_avg" numeric, "overall_avg" numeric, "would_practice_again_percent" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG((sf.structure_rating + sf.presence_rating + sf.overall_rating)::NUMERIC / 3), 1),
    COUNT(*),
    ROUND(AVG(sf.structure_rating::NUMERIC), 1),
    ROUND(AVG(sf.presence_rating::NUMERIC), 1),
    ROUND(AVG(sf.overall_rating::NUMERIC), 1),
    ROUND(AVG(CASE WHEN sf.would_practice_again THEN 100 ELSE 0 END)::NUMERIC, 0)
  FROM session_feedback sf
  WHERE sf.rated_user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_ratings"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_verification_stats"("target_user_id" "uuid") RETURNS TABLE("verification_count" integer, "is_verified" boolean, "trust_level" "public"."trust_level")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM peer_verifications WHERE verified_user_id = target_user_id AND is_active = true),
    (SELECT p.trust_level = 'verified' FROM profiles p WHERE p.id = target_user_id),
    (SELECT p.trust_level FROM profiles p WHERE p.id = target_user_id);
END;
$$;


ALTER FUNCTION "public"."get_verification_stats"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_verifiers"("target_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "avatar_url" "text", "verified_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, pv.created_at AS verified_at
  FROM peer_verifications pv
  JOIN profiles p ON p.id = pv.verifier_id
  WHERE pv.verified_user_id = target_user_id AND pv.is_active = true
  ORDER BY pv.created_at DESC LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."get_verifiers"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_login_attempt"("p_ip_hash" "text", "p_email_hash" "text", "p_success" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO login_attempts (ip_hash, email_hash, success) VALUES (p_ip_hash, p_email_hash, p_success);
  IF p_success THEN
    DELETE FROM login_attempts WHERE email_hash = p_email_hash AND NOT success;
  END IF;
END;
$$;


ALTER FUNCTION "public"."log_login_attempt"("p_ip_hash" "text", "p_email_hash" "text", "p_success" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_verification_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_trust_level(OLD.verified_user_id);
  ELSE
    PERFORM recalculate_trust_level(NEW.verified_user_id);
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."on_verification_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_trust_level"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM peer_verifications pv
  JOIN profiles p ON p.id = pv.verifier_id
  WHERE pv.verified_user_id = user_id
    AND pv.is_active = true
    AND p.trust_level = 'verified';

  UPDATE profiles SET
    trust_level = CASE
      WHEN active_count >= 3 THEN 'verified'::trust_level
      WHEN active_count >= 1 THEN 'known'::trust_level
      ELSE 'new'::trust_level
    END,
    confirmations = active_count
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."recalculate_trust_level"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_partners_fuzzy"("p_search_term" "text" DEFAULT ''::"text", "p_exclude_user_id" "uuid" DEFAULT NULL::"uuid", "p_trust_filter" "text" DEFAULT NULL::"text", "p_level_filter" integer[] DEFAULT NULL::integer[], "p_duration_filter" integer DEFAULT NULL::integer, "p_online_only" boolean DEFAULT false, "p_sort_by" "text" DEFAULT 'recent'::"text", "p_page_offset" integer DEFAULT 0, "p_page_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "name" "text", "avatar_url" "text", "bio" "text", "trust_level" "public"."trust_level", "confirmations" integer, "is_online" boolean, "is_available" boolean, "preferred_levels" integer[], "preferred_duration" integer, "sessions_completed" integer, "compliance_rate" numeric, "em_experience_months" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "similarity_score" real, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT p.*,
      CASE WHEN p_search_term != '' THEN similarity(p.name, p_search_term) ELSE 0 END AS sim_score,
      COUNT(*) OVER() AS total
    FROM profiles p
    LEFT JOIN blocked_partners bp1 ON bp1.user_id = p_exclude_user_id AND bp1.blocked_user_id = p.id
    LEFT JOIN blocked_partners bp2 ON bp2.user_id = p.id AND bp2.blocked_user_id = p_exclude_user_id
    WHERE (p_exclude_user_id IS NULL OR p.id != p_exclude_user_id)
      AND bp1.id IS NULL AND bp2.id IS NULL
      AND (p_search_term = '' OR p.name % p_search_term)
      AND (p_trust_filter IS NULL OR p.trust_level::TEXT = p_trust_filter)
      AND (p_level_filter IS NULL OR p.preferred_levels && p_level_filter)
      AND (p_duration_filter IS NULL OR p.preferred_duration = p_duration_filter)
      AND (NOT p_online_only OR p.is_online = true)
  )
  SELECT f.id, f.name, f.avatar_url, f.bio, f.trust_level,
    f.confirmations, f.is_online, f.is_available,
    f.preferred_levels, f.preferred_duration, f.sessions_completed,
    f.compliance_rate, f.em_experience_months,
    f.created_at, f.updated_at, f.sim_score, f.total
  FROM filtered f
  ORDER BY
    CASE p_sort_by
      WHEN 'name' THEN f.name
      WHEN 'newest' THEN NULL
      WHEN 'sessions' THEN NULL
      ELSE NULL
    END,
    CASE WHEN p_search_term != '' THEN f.sim_score END DESC NULLS LAST,
    CASE p_sort_by
      WHEN 'sessions' THEN f.sessions_completed
      ELSE NULL
    END DESC NULLS LAST,
    f.updated_at DESC
  OFFSET p_page_offset LIMIT p_page_limit;
END;
$$;


ALTER FUNCTION "public"."search_partners_fuzzy"("p_search_term" "text", "p_exclude_user_id" "uuid", "p_trust_filter" "text", "p_level_filter" integer[], "p_duration_filter" integer, "p_online_only" boolean, "p_sort_by" "text", "p_page_offset" integer, "p_page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation_token"("p_token" "text") RETURNS TABLE("id" "uuid", "inviter_id" "uuid", "inviter_name" "text", "inviter_avatar" "text", "expires_at" timestamp with time zone, "is_valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.inviter_id, p.name, p.avatar_url, i.expires_at,
    (i.is_active AND i.used_at IS NULL AND i.expires_at > NOW()) AS is_valid
  FROM invitations i
  JOIN profiles p ON p.id = i.inviter_id
  WHERE i.token = p_token;
END;
$$;


ALTER FUNCTION "public"."validate_invitation_token"("p_token" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."availability_slots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "availability_slots_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "valid_time_range" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."availability_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blocked_partners" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "blocked_user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."blocked_partners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewed_id" "uuid" NOT NULL,
    "followed_rules" boolean NOT NULL,
    "trust_confirmed" boolean,
    "private_note" "text",
    "block_partner" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "inviter_id" "uuid" NOT NULL,
    "token" character varying(32) NOT NULL,
    "used_at" timestamp with time zone,
    "invited_user_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_hash" "text" NOT NULL,
    "email_hash" "text" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "success" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."login_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."peer_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verifier_id" "uuid" NOT NULL,
    "verified_user_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "peer_verifications_check" CHECK (("verifier_id" <> "verified_user_id"))
);


ALTER TABLE "public"."peer_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "trust_level" "public"."trust_level" DEFAULT 'new'::"public"."trust_level" NOT NULL,
    "confirmations" integer DEFAULT 0 NOT NULL,
    "is_online" boolean DEFAULT false NOT NULL,
    "is_available" boolean DEFAULT false NOT NULL,
    "preferred_levels" integer[] DEFAULT '{1}'::integer[] NOT NULL,
    "preferred_duration" integer DEFAULT 15 NOT NULL,
    "sessions_completed" integer DEFAULT 0 NOT NULL,
    "compliance_rate" numeric(5,2) DEFAULT 100.00 NOT NULL,
    "em_experience_months" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rating_disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dispute_type" "text" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "disputed_user_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "verification_id" "uuid",
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "resolution" "text",
    "resolved_at" timestamp with time zone,
    "resolved_by" "text",
    CONSTRAINT "rating_disputes_dispute_type_check" CHECK (("dispute_type" = ANY (ARRAY['rating'::"text", 'verification'::"text", 'other'::"text"]))),
    CONSTRAINT "rating_disputes_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'investigating'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."rating_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid",
    "requester_id" "uuid" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "duration" integer DEFAULT 15 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "status" character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    "reminder_sent" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "message" "text",
    "pending_response_from" "uuid",
    CONSTRAINT "scheduled_sessions_level_check" CHECK ((("level" >= 1) AND ("level" <= 4))),
    CONSTRAINT "scheduled_sessions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['proposed'::character varying, 'scheduled'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."scheduled_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_id" "uuid" NOT NULL,
    "rated_user_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "structure_rating" integer NOT NULL,
    "presence_rating" integer NOT NULL,
    "overall_rating" integer NOT NULL,
    "would_practice_again" boolean NOT NULL,
    CONSTRAINT "session_feedback_overall_rating_check" CHECK ((("overall_rating" >= 1) AND ("overall_rating" <= 5))),
    CONSTRAINT "session_feedback_presence_rating_check" CHECK ((("presence_rating" >= 1) AND ("presence_rating" <= 5))),
    CONSTRAINT "session_feedback_structure_rating_check" CHECK ((("structure_rating" >= 1) AND ("structure_rating" <= 5)))
);


ALTER TABLE "public"."session_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "duration" integer NOT NULL,
    "scheduled_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "status" "public"."session_status" DEFAULT 'pending'::"public"."session_status" NOT NULL,
    "room_url" "text",
    "room_token" "text",
    "partner_token" "text",
    "is_open" boolean DEFAULT false,
    "third_participant_id" "uuid",
    "third_participant_token" "text",
    "deleted_by_requester" boolean DEFAULT false,
    "deleted_by_partner" boolean DEFAULT false,
    CONSTRAINT "sessions_duration_check" CHECK (("duration" > 0)),
    CONSTRAINT "sessions_level_check" CHECK ((("level" >= 1) AND ("level" <= 5)))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."availability_slots"
    ADD CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_partners"
    ADD CONSTRAINT "blocked_partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_partners"
    ADD CONSTRAINT "blocked_partners_user_id_blocked_user_id_key" UNIQUE ("user_id", "blocked_user_id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_session_id_reviewer_id_key" UNIQUE ("session_id", "reviewer_id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."login_attempts"
    ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."peer_verifications"
    ADD CONSTRAINT "peer_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."peer_verifications"
    ADD CONSTRAINT "peer_verifications_verifier_id_verified_user_id_key" UNIQUE ("verifier_id", "verified_user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."rating_disputes"
    ADD CONSTRAINT "rating_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_sessions"
    ADD CONSTRAINT "scheduled_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_feedback"
    ADD CONSTRAINT "session_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_feedback"
    ADD CONSTRAINT "session_feedback_session_id_reviewer_id_key" UNIQUE ("session_id", "reviewer_id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_availability_day" ON "public"."availability_slots" USING "btree" ("day_of_week");



CREATE INDEX "idx_availability_user" ON "public"."availability_slots" USING "btree" ("user_id");



CREATE INDEX "idx_feedback_rated_user" ON "public"."session_feedback" USING "btree" ("rated_user_id");



CREATE INDEX "idx_feedback_session" ON "public"."session_feedback" USING "btree" ("session_id");



CREATE INDEX "idx_invitations_inviter" ON "public"."invitations" USING "btree" ("inviter_id");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_login_attempts_cleanup" ON "public"."login_attempts" USING "btree" ("attempted_at");



CREATE INDEX "idx_login_attempts_email_time" ON "public"."login_attempts" USING "btree" ("email_hash", "attempted_at" DESC);



CREATE INDEX "idx_login_attempts_ip_time" ON "public"."login_attempts" USING "btree" ("ip_hash", "attempted_at" DESC);



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" (LEAST("sender_id", "recipient_id"), GREATEST("sender_id", "recipient_id"), "created_at" DESC);



CREATE INDEX "idx_messages_recipient" ON "public"."messages" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "idx_peer_verifications_active" ON "public"."peer_verifications" USING "btree" ("is_active");



CREATE INDEX "idx_peer_verifications_verified_user" ON "public"."peer_verifications" USING "btree" ("verified_user_id");



CREATE INDEX "idx_peer_verifications_verifier" ON "public"."peer_verifications" USING "btree" ("verifier_id");



CREATE INDEX "idx_profiles_is_available" ON "public"."profiles" USING "btree" ("is_available");



CREATE INDEX "idx_profiles_name_trgm" ON "public"."profiles" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_profiles_online_updated" ON "public"."profiles" USING "btree" ("is_online", "updated_at" DESC);



CREATE INDEX "idx_profiles_sessions_completed" ON "public"."profiles" USING "btree" ("sessions_completed" DESC);



CREATE INDEX "idx_profiles_trust_level" ON "public"."profiles" USING "btree" ("trust_level");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_rating_disputes_reporter" ON "public"."rating_disputes" USING "btree" ("reporter_id");



CREATE INDEX "idx_rating_disputes_status" ON "public"."rating_disputes" USING "btree" ("status");



CREATE INDEX "idx_scheduled_sessions_date" ON "public"."scheduled_sessions" USING "btree" ("scheduled_for");



CREATE INDEX "idx_scheduled_sessions_partner" ON "public"."scheduled_sessions" USING "btree" ("partner_id");



CREATE INDEX "idx_scheduled_sessions_pending" ON "public"."scheduled_sessions" USING "btree" ("pending_response_from") WHERE (("status")::"text" = 'proposed'::"text");



CREATE INDEX "idx_scheduled_sessions_requester" ON "public"."scheduled_sessions" USING "btree" ("requester_id");



CREATE INDEX "idx_scheduled_sessions_status" ON "public"."scheduled_sessions" USING "btree" ("status");



CREATE INDEX "idx_sessions_deleted" ON "public"."sessions" USING "btree" ("deleted_by_requester", "deleted_by_partner");



CREATE INDEX "idx_sessions_is_open" ON "public"."sessions" USING "btree" ("is_open") WHERE ("is_open" = true);



CREATE INDEX "idx_sessions_partner" ON "public"."sessions" USING "btree" ("partner_id");



CREATE INDEX "idx_sessions_requester" ON "public"."sessions" USING "btree" ("requester_id");



CREATE INDEX "idx_sessions_status" ON "public"."sessions" USING "btree" ("status");



CREATE INDEX "idx_sessions_third_participant" ON "public"."sessions" USING "btree" ("third_participant_id") WHERE ("third_participant_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "availability_slots_updated_at" BEFORE UPDATE ON "public"."availability_slots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_invite_limit" BEFORE INSERT ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."check_invite_limit"();



CREATE OR REPLACE TRIGGER "peer_verifications_recalculate" AFTER INSERT OR DELETE OR UPDATE ON "public"."peer_verifications" FOR EACH ROW EXECUTE FUNCTION "public"."on_verification_change"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "push_subscriptions_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "scheduled_sessions_updated_at" BEFORE UPDATE ON "public"."scheduled_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_disputes"
    ADD CONSTRAINT "rating_disputes_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "public"."peer_verifications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_feedback"
    ADD CONSTRAINT "session_feedback_rated_user_id_fkey" FOREIGN KEY ("rated_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_feedback"
    ADD CONSTRAINT "session_feedback_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_feedback"
    ADD CONSTRAINT "session_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_third_participant_id_fkey" FOREIGN KEY ("third_participant_id") REFERENCES "public"."profiles"("id");



ALTER TABLE "public"."availability_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "availability_slots_delete" ON "public"."availability_slots" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "availability_slots_insert" ON "public"."availability_slots" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "availability_slots_select" ON "public"."availability_slots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "availability_slots_update" ON "public"."availability_slots" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."blocked_partners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blocked_partners_delete" ON "public"."blocked_partners" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "blocked_partners_insert" ON "public"."blocked_partners" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "blocked_partners_select" ON "public"."blocked_partners" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_insert" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (("reviewer_id" = "auth"."uid"()));



CREATE POLICY "feedback_select" ON "public"."feedback" FOR SELECT TO "authenticated" USING ((("reviewer_id" = "auth"."uid"()) OR ("reviewed_id" = "auth"."uid"())));



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitations_insert" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK (("inviter_id" = "auth"."uid"()));



CREATE POLICY "invitations_select" ON "public"."invitations" FOR SELECT TO "authenticated" USING (("inviter_id" = "auth"."uid"()));



CREATE POLICY "invitations_update" ON "public"."invitations" FOR UPDATE TO "authenticated" USING (("inviter_id" = "auth"."uid"()));



ALTER TABLE "public"."login_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."peer_verifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "peer_verifications_delete" ON "public"."peer_verifications" FOR DELETE TO "authenticated" USING (("verifier_id" = "auth"."uid"()));



CREATE POLICY "peer_verifications_insert" ON "public"."peer_verifications" FOR INSERT TO "authenticated" WITH CHECK (("verifier_id" = "auth"."uid"()));



CREATE POLICY "peer_verifications_select" ON "public"."peer_verifications" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "peer_verifications_update" ON "public"."peer_verifications" FOR UPDATE TO "authenticated" USING (("verifier_id" = "auth"."uid"()));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_subscriptions_delete" ON "public"."push_subscriptions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_subscriptions_insert" ON "public"."push_subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "push_subscriptions_select" ON "public"."push_subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_subscriptions_update" ON "public"."push_subscriptions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."rating_disputes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rating_disputes_insert" ON "public"."rating_disputes" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "rating_disputes_select" ON "public"."rating_disputes" FOR SELECT TO "authenticated" USING (("reporter_id" = "auth"."uid"()));



ALTER TABLE "public"."scheduled_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scheduled_sessions_insert" ON "public"."scheduled_sessions" FOR INSERT TO "authenticated" WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "scheduled_sessions_select" ON "public"."scheduled_sessions" FOR SELECT TO "authenticated" USING ((("requester_id" = "auth"."uid"()) OR ("partner_id" = "auth"."uid"())));



CREATE POLICY "scheduled_sessions_update" ON "public"."scheduled_sessions" FOR UPDATE TO "authenticated" USING ((("requester_id" = "auth"."uid"()) OR ("partner_id" = "auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."peer_verifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scheduled_sessions";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_invite_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_invite_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_invite_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_login_rate_limit"("p_ip_hash" "text", "p_email_hash" "text", "p_max_attempts" integer, "p_window_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_login_rate_limit"("p_ip_hash" "text", "p_email_hash" "text", "p_max_attempts" integer, "p_window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_login_rate_limit"("p_ip_hash" "text", "p_email_hash" "text", "p_max_attempts" integer, "p_window_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_login_attempts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_login_attempts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_login_attempts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_open_sessions"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_open_sessions"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_open_sessions"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_partners"("p_user_id" "uuid", "lim" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_partners"("p_user_id" "uuid", "lim" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recommended_partners"("p_user_id" "uuid", "lim" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommended_partners"("p_user_id" "uuid", "lim" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommended_partners"("p_user_id" "uuid", "lim" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_ratings"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_ratings"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_ratings"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_verification_stats"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verification_stats"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verification_stats"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_verifiers"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verifiers"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verifiers"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_ip_hash" "text", "p_email_hash" "text", "p_success" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_ip_hash" "text", "p_email_hash" "text", "p_success" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_login_attempt"("p_ip_hash" "text", "p_email_hash" "text", "p_success" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."on_verification_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_verification_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_verification_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_trust_level"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_trust_level"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_trust_level"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_partners_fuzzy"("p_search_term" "text", "p_exclude_user_id" "uuid", "p_trust_filter" "text", "p_level_filter" integer[], "p_duration_filter" integer, "p_online_only" boolean, "p_sort_by" "text", "p_page_offset" integer, "p_page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_partners_fuzzy"("p_search_term" "text", "p_exclude_user_id" "uuid", "p_trust_filter" "text", "p_level_filter" integer[], "p_duration_filter" integer, "p_online_only" boolean, "p_sort_by" "text", "p_page_offset" integer, "p_page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."availability_slots" TO "anon";
GRANT ALL ON TABLE "public"."availability_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_slots" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_partners" TO "anon";
GRANT ALL ON TABLE "public"."blocked_partners" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_partners" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."login_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."peer_verifications" TO "anon";
GRANT ALL ON TABLE "public"."peer_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."peer_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."rating_disputes" TO "anon";
GRANT ALL ON TABLE "public"."rating_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."rating_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_sessions" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."session_feedback" TO "anon";
GRANT ALL ON TABLE "public"."session_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."session_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."scheduled_sessions" drop constraint "scheduled_sessions_status_check";

alter table "public"."scheduled_sessions" add constraint "scheduled_sessions_status_check" CHECK (((status)::text = ANY ((ARRAY['proposed'::character varying, 'scheduled'::character varying, 'cancelled'::character varying, 'completed'::character varying, 'rejected'::character varying])::text[]))) not valid;

alter table "public"."scheduled_sessions" validate constraint "scheduled_sessions_status_check";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "avatars_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatars_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "avatars_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatars_upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



