-- Task 114: distinguish Gmail vs Resend inbound rows + idempotent provider ids
ALTER TABLE inbound_email_events
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

COMMENT ON COLUMN inbound_email_events.provider IS 'Inbound source: resend | gmail';
COMMENT ON COLUMN inbound_email_events.provider_message_id IS 'Provider-native message id for dedupe';

CREATE UNIQUE INDEX IF NOT EXISTS inbound_email_events_provider_msg_unique
  ON inbound_email_events (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- Backfill Resend rows for cleaner uniqueness (idempotent)
UPDATE inbound_email_events
SET provider_message_id = resend_email_id
WHERE provider = 'resend'
  AND provider_message_id IS NULL
  AND resend_email_id IS NOT NULL;

-- Rollback (manual):
-- DROP INDEX IF EXISTS inbound_email_events_provider_msg_unique;
-- ALTER TABLE inbound_email_events DROP COLUMN IF EXISTS provider_message_id;
-- ALTER TABLE inbound_email_events DROP COLUMN IF EXISTS provider;
