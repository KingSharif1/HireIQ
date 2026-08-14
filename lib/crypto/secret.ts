import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function encryptionKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('AI_KEY_ENCRYPTION_SECRET or SUPABASE_SERVICE_ROLE_KEY is required to store API keys')
  }
  return createHash('sha256').update(secret).digest()
}

/** AES-256-GCM. Output is base64(iv || tag || ciphertext). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < 29) throw new Error('Invalid encrypted payload')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function last4(value: string): string {
  const trimmed = value.trim()
  return trimmed.slice(-4)
}
