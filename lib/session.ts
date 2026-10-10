import { createHmac, timingSafeEqual } from 'crypto'

// Mock session tokens for the demo login flow.
//
// Tokens are `<expiry>:<username>:<hmac>` and are verified with a
// timing-safe HMAC comparison, so a forged/tampered cookie is rejected.
// Replace with your real session/auth provider (or sign with your own
// rotating secret) when wiring up production auth.

export const SESSION_COOKIE = 'sonicraft_session'
const MAX_AGE_SECONDS = 60 * 60 // one hour

// Demo fallback secret. In production always provide a strong random
// SESSION_SECRET (e.g. `openssl rand -hex 32`); with this fallback anyone
// who reads the source can forge session cookies.
const SECRET = process.env.SESSION_SECRET ?? 'sonicraft-dev-secret-do-not-use-in-production'

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createSessionToken(username: string): string {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = `${expiresAt}:${username}`
  return `${payload}:${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): { valid: boolean; username?: string } {
  if (!token) return { valid: false }

  const firstSep = token.indexOf(':')
  const lastSep = token.lastIndexOf(':')
  if (firstSep === -1 || lastSep <= firstSep) return { valid: false }

  const expiresAt = token.slice(0, firstSep)
  const username = token.slice(firstSep + 1, lastSep)
  const signature = token.slice(lastSep + 1)

  const provided = Buffer.from(signature, 'utf8')
  const expected = Buffer.from(sign(`${expiresAt}:${username}`), 'utf8')
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { valid: false }
  }

  const expiry = Number(expiresAt)
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    return { valid: false }
  }

  return { valid: true, username }
}

export function sessionCookie(token: string, secure: boolean): string {
  const flags = ['HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${MAX_AGE_SECONDS}`]
  // Only mark Secure on HTTPS origins — a Secure cookie would be dropped
  // when the demo runs over plain http://localhost.
  if (secure) flags.push('Secure')
  return `${SESSION_COOKIE}=${token}; ${flags.join('; ')}`
}
