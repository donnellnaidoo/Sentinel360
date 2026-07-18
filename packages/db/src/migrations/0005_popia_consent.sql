-- POPIA s11: capture when a data subject consented to processing at
-- registration. Backfilled as NULL for existing users — those accounts
-- predate consent capture and are a known compliance gap, not remediated
-- retroactively by this migration.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS popia_consent_at timestamptz;
