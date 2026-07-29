-- POPIA s24 (right to deletion): data subjects can request deletion of
-- their personal information; the request is reviewed by an admin rather
-- than auto-executed, since cases, evidence, and audit_log rows referencing
-- the user are retained under POPIA s11(1)(d)/(f) legal-obligation /
-- legitimate-interest grounds (CPA 51/1977 evidentiary retention). See
-- packages/api/src/routers/popia.ts.
--
-- Hand-written, not drizzle-kit generate/push — see 0008's header for why.

CREATE TABLE IF NOT EXISTS data_deletion_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reason text,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  reviewed_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_deletion_request_user_idx ON data_deletion_request(user_id);
CREATE INDEX IF NOT EXISTS data_deletion_request_status_idx ON data_deletion_request(status);
