-- Portal passwords are encrypted at rest by the app (AES-256-GCM via lib/crypto/secret.ts).
-- The column stays TEXT so existing plaintext rows keep reading until they are rewritten.
-- Readers must use readStoredSecret(): decrypt when the payload is ciphertext, otherwise return the legacy plaintext.

COMMENT ON COLUMN applications.ats_account_password IS
  'Employer portal password when HireIQ created the account. AES-256-GCM ciphertext (base64). Legacy rows may still be plaintext; the app decrypts or passes through.';

-- Rollback (comment only — do not drop the column; 019 owns the column):
-- COMMENT ON COLUMN applications.ats_account_password IS
--   'Employer portal password when HireIQ agentic apply created the account. User-visible on timeline.';
