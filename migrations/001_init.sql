-- Migration 001: Extensions + Enum Types
-- Voraussetzungen fuer alle nachfolgenden Migrations
-- Quelle: NEXT_APP_STARTER.md Abschnitt 7.0

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- Fuzzy-Suche (GIN Index in 002)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4() in 002

-- Enum Types
CREATE TYPE session_status AS ENUM ('pending', 'accepted', 'active', 'completed', 'cancelled');
CREATE TYPE trust_level AS ENUM ('new', 'known', 'verified');
