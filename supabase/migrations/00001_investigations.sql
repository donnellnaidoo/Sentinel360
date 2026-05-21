-- Migration: Investigations, Evidence, Suspects
-- Run this in your Supabase SQL editor

-- ============================================
-- 1. CASE table (investigations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.case (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'MEDIUM',
  status text NOT NULL DEFAULT 'OPEN',
  assigned_to_user_id text REFERENCES public.user(id),
  created_by_user_id text REFERENCES public.user(id),
  closed_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT case_pkey PRIMARY KEY (id)
);

-- ============================================
-- 2. CASE EVIDENCE (links evidence to cases)
-- ============================================
CREATE TABLE IF NOT EXISTS public.case_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.case(id) ON DELETE CASCADE,
  evidence_entity_type text NOT NULL,
  evidence_entity_id text NOT NULL,
  relationship_description text,
  created_by_user_id text REFERENCES public.user(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT case_evidence_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_case_id ON public.case_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_entity ON public.case_evidence(evidence_entity_type, evidence_entity_id);

-- ============================================
-- 3. INVESTIGATION NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.investigation_note (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.case(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'GENERAL',
  content text NOT NULL,
  created_by_user_id text REFERENCES public.user(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT investigation_note_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_investigation_note_case_id ON public.investigation_note(case_id);

-- ============================================
-- 4. ENTITY PROFILE (suspects / persons of interest)
-- ============================================
CREATE TABLE IF NOT EXISTS public.entity_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  display_name text,
  primary_face_image_url text,
  primary_face_embedding jsonb,
  known_plate_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  detection_count integer NOT NULL DEFAULT 0,
  locations_seen jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'ACTIVE',
  watchlist_status text NOT NULL DEFAULT 'NONE',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entity_profile_pkey PRIMARY KEY (id)
);

-- ============================================
-- 5. MEDIA ASSET (for evidence images)
-- ============================================
CREATE TABLE IF NOT EXISTS public.media_asset (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  description text,
  source text NOT NULL,
  source_camera_id text,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  file_hash text NOT NULL UNIQUE,
  storage_url text NOT NULL,
  storage_tier text NOT NULL DEFAULT 'HOT',
  duration integer,
  resolution text,
  codec text,
  framerate numeric,
  gps_latitude numeric,
  gps_longitude numeric,
  status text NOT NULL DEFAULT 'PROCESSING',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text REFERENCES public.user(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT media_asset_pkey PRIMARY KEY (id)
);

-- ============================================
-- 6. USER table (sync from auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user (
  id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_pkey PRIMARY KEY (id)
);

-- ============================================
-- 7. DETECTION table (for detection evidence)
-- ============================================
CREATE TABLE IF NOT EXISTS public.detection (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  detection_type text NOT NULL,
  classification text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity text NOT NULL,
  media_asset_id uuid NOT NULL REFERENCES public.media_asset(id),
  camera_id uuid,
  frame_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status text NOT NULL DEFAULT 'PENDING',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT detection_pkey PRIMARY KEY (id)
);

-- ============================================
-- Enable RLS (optional - disable if not needed)
-- ============================================
ALTER TABLE public.case ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (adjust policies as needed)
CREATE POLICY IF NOT EXISTS "Allow all access to authenticated users" ON public.case
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all access to authenticated users" ON public.case_evidence
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all access to authenticated users" ON public.investigation_note
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all access to authenticated users" ON public.entity_profile
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all access to authenticated users" ON public.media_asset
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all access to authenticated users" ON public.detection
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Seed some sample entity profiles for testing
-- ============================================
INSERT INTO public.entity_profile (entity_type, display_name, primary_face_image_url, watchlist_status, status, notes)
SELECT * FROM (VALUES
  ('person', 'Marcus Vane', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', 'WANTED', 'ACTIVE', 'Suspected in multiple transit heists'),
  ('person', 'Elena Petrova', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', 'PERSON_OF_INTEREST', 'ACTIVE', 'Known associate of Marcus Vane'),
  ('person', 'Julian Graves', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop', 'WANTED', 'ACTIVE', 'Arms dealer connected to organized crime'),
  ('person', 'Li Wei', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', 'MONITORING', 'ACTIVE', 'Corporate espionage suspect under surveillance')
) AS v(entity_type, display_name, primary_face_image_url, watchlist_status, status, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.entity_profile LIMIT 1);
