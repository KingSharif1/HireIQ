import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
  processResendInbound,
  type ResendReceivedEvent,
} from '@/lib/email/process-inbound'

export const runtime = 'nodejs'
/** Forward-to-save may scrape a job URL before returning. */
export const maxDuration = 60

/**
 * Resend inbound webhook — subscribe to `email.received`.
 * Verify with RESEND_WEBHOOK_SECRET (Svix).
 */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend webhook] RESEND_WEBHOOK_SECRET missing')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const payload = await request.text()
  const headers = {
    id: request.headers.get('svix-id') ?? '',
    timestamp: request.headers.get('svix-timestamp') ?? '',
    signature: request.headers.get('svix-signature') ?? '',
  }

  if (!headers.id || !headers.timestamp || !headers.signature) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 })
  }

  let event: ResendReceivedEvent
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || 're_webhook_verify_only')
    event = resend.webhooks.verify({
      payload,
      headers,
      webhookSecret: secret,
    }) as ResendReceivedEvent
  } catch (err) {
    console.error('[resend webhook] verify failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const result = await processResendInbound(event)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[resend webhook] process failed', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
