-- ============================================================================
-- Migration: 20260613000001_extensions.sql
-- Purpose:  Enable required PostgreSQL extensions for Sentinel360
-- Applied:  2026-06-13
-- ============================================================================

-- pgcrypto: Cryptographic functions (gen_random_uuid(), digest(), etc.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- postgis: Geospatial data types and queries (GEOGRAPHY, GEOMETRY, GIST indexes)
CREATE EXTENSION IF NOT EXISTS postgis;

-- vector: pgvector extension for AI/ML vector embeddings (face recognition, etc.)
CREATE EXTENSION IF NOT EXISTS vector;

-- pg_stat_statements: Query performance monitoring and tuning
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
