/**
 * Build the Claude prompt for a referral ask / warm intro. Messages are DRAFTS —
 * the user reviews and sends on LinkedIn. HireIQ never sends.
 */

export type ReferralDraftKind = 'warm_intro' | 'direct_referral'

export interface ReferralDraftInput {
  connectionName: string
  connectionCompany: string
  connectionPosition: string
  targetCompany: string
  targetRole: string
  /** The candidate's own 1-2 line summary / headline, in their words. */
  candidateSummary: string
  kind: ReferralDraftKind
}

export function buildReferralDraftPrompt(input: ReferralDraftInput): string {
  const ask =
    input.kind === 'warm_intro'
      ? 'a short warm-intro message (you do not know them well; ask if they can point you in the right direction)'
      : 'a direct referral-request message (ask if they would be willing to refer you, without pressure)'

  return `Write ${ask} from a job seeker to a LinkedIn connection, as a DRAFT the user will review and send themselves.

CONNECTION:
- Name: ${input.connectionName || '(unknown)'}
- Works at: ${input.connectionCompany || '(unknown)'}
- Position: ${input.connectionPosition || '(unknown)'}

TARGET:
- Company: ${input.targetCompany}
- Role: ${input.targetRole}

CANDIDATE (their own words):
${input.candidateSummary || '(no summary provided)'}

RULES:
- 2-4 sentences, natural and specific, no flattery or begging.
- Reference the connection's company/role only as given — NEVER invent a relationship, a shared history, or how you know them.
- Sound like the candidate, not a generator: no em-dashes, no "leverage/utilize/spearhead", no "passionate about".
- End with a low-pressure ask and an easy out ("no worries if not").
- Return ONLY the message text — no subject, no commentary.`
}
