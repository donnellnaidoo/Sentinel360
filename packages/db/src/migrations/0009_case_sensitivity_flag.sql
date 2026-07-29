-- Sensitive-case visibility restriction (POPIA condition 6 — security
-- safeguards). docs/03-DOMAIN-MODEL/04-cases-domain.md always documented
-- this flag; the schema never had it, so nothing enforced it. Enforcement
-- lives in packages/api/src/routers/cases.ts#assertCaseVisible, not RLS —
-- app-layer role/assignment checks are already the pattern for permission
-- gating in this codebase (requirePermission), so this stays consistent
-- with that rather than introducing a second enforcement mechanism.
--
-- Hand-written, not drizzle-kit generate/push — see 0008's header for why.

ALTER TABLE "case" ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS case_is_sensitive_idx ON "case"(is_sensitive) WHERE is_sensitive = true;
