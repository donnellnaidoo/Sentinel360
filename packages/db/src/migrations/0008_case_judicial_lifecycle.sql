-- Case judicial lifecycle: suspect/witness/victim linking, arrest, NPA
-- prosecution decision, court hearings (first appearance / bail / pre-trial
-- / plea / trial / sentencing / appeal), and a dedicated immutable case
-- timeline table. See packages/db/src/schema/cases.ts and
-- packages/api/src/services/case-timeline.ts / case-next-actions.ts.
--
-- Hand-written (not drizzle-kit generate/push) because the live database
-- has ~65 tables from an earlier, larger schema bootstrap that the current
-- pared-down Drizzle schema files don't describe; a full push would treat
-- those as candidates for deletion. This migration only touches the 5 new
-- tables below and reads nothing else.

CREATE TABLE IF NOT EXISTS case_criminal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  role text NOT NULL,
  notes text,
  linked_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_criminal_case_idx ON case_criminal(case_id);

CREATE TABLE IF NOT EXISTS case_arrest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  entity_profile_id uuid NOT NULL REFERENCES entity_profile(id) ON DELETE CASCADE,
  arrested_at timestamptz NOT NULL,
  arrested_by_officer_id uuid REFERENCES law_enforcement_officer(id) ON DELETE SET NULL,
  with_warrant boolean NOT NULL DEFAULT false,
  warrant_number text,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  rights_informed_at timestamptz,
  custody_status text NOT NULL DEFAULT 'IN_CUSTODY',
  notes text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_arrest_case_idx ON case_arrest(case_id);

CREATE TABLE IF NOT EXISTS case_prosecution_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  decision text NOT NULL,
  prosecutor_name text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_prosecution_decision_case_idx ON case_prosecution_decision(case_id);

CREATE TABLE IF NOT EXISTS case_hearing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  hearing_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  court_name text,
  case_roll_number text,
  presiding_officer text,
  outcome_type text NOT NULL DEFAULT 'PENDING',
  outcome_notes text,
  next_hearing_at timestamptz,
  bail_schedule_classification text,
  bail_amount numeric(12,2),
  bail_conditions text,
  bail_decision text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_hearing_case_idx ON case_hearing(case_id);
CREATE INDEX IF NOT EXISTS case_hearing_scheduled_idx ON case_hearing(scheduled_at);

CREATE TABLE IF NOT EXISTS case_timeline_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_timeline_entry_case_idx ON case_timeline_entry(case_id);
CREATE INDEX IF NOT EXISTS case_timeline_entry_occurred_idx ON case_timeline_entry(occurred_at);
