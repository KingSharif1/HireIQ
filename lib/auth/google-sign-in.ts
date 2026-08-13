/** Shared Google sign-in options: identity + Gmail readonly in one consent. */
export const GOOGLE_SIGNIN_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

export function googleSignInOAuthOptions(redirectTo: string) {
  return {
    redirectTo,
    scopes: GOOGLE_SIGNIN_SCOPES,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    },
  }
}
