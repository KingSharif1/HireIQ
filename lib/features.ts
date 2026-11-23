/**
 * Product surface flags. v1 is Tailor + Resume + Tracker; v2 "agent job hub"
 * surfaces (Scout, Referrals, hosted auto-apply, board discovery) stay in the
 * codebase but are hidden unless NEXT_PUBLIC_V2_SURFACES=1 at build time.
 */
export const V2_SURFACES_ENABLED = process.env.NEXT_PUBLIC_V2_SURFACES === '1'
