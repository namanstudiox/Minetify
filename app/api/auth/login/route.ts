import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { clear, clientIp, count, isBlocked } from '@/lib/rate-limit'
import { createSessionToken, sessionCookie } from '@/lib/session'

// Original backend endpoint (replaces port 8000)
const ORIGINAL_AUTH_URL = process.env.AUTH_API_URL || 'http://localhost:5050/api/auth/login'

// Mock user store fallback — used if backend server is offline in development.
// Demo credentials: demo / password123  (or demo@sonicraft.app / password123)
const MOCK_USERS: Record<string, string> = {
  demo: 'password123',
  'demo@sonicraft.app': 'password123',
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS_PER_IP = 60
// Backstop against address rotation: per-IP keys are only as trustworthy as
// the proxy headers in front of the app, so also cap total attempts.
const MAX_ATTEMPTS_GLOBAL = 300
const MAX_FAILURES_PER_IDENTIFIER = 5
const MAX_IDENTIFIER_LENGTH = 254 // RFC 5321 email-address ceiling
const MAX_PASSWORD_LENGTH = 1024
const MOCK_LATENCY_MS = 300

// Identical for existing and non-existing accounts — never vary this per case,
// or the endpoint becomes a username-enumeration oracle.
const INVALID_CREDENTIALS = 'Invalid username or password. Try again.'

const NO_STORE = { 'Cache-Control': 'no-store' }

// Same sanitizer the reference implementation applies client-side.
function sanitize(value: string) {
  return value.trim().replace(/[<>\"']/g, '')
}

// Constant-time comparison: hash both sides to equal-length digests so a
// timing-safe compare can run without leaking value length.
function safeMatch(candidate: string, expected: string): boolean {
  const a = createHash('sha256').update(candidate).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function rateLimited(retryAfterSec: number, message: string) {
  return NextResponse.json(
    { message },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec), ...NO_STORE } },
  )
}

export async function POST(request: Request) {
  const global = count('login:global', MAX_ATTEMPTS_GLOBAL, WINDOW_MS)
  if (global.count > MAX_ATTEMPTS_GLOBAL) {
    return rateLimited(
      Math.ceil((global.resetAt - Date.now()) / 1000),
      'Too many login attempts. Please try again later.',
    )
  }

  const attempts = count(`login:ip:${clientIp(request)}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS)
  if (attempts.count > MAX_ATTEMPTS_PER_IP) {
    return rateLimited(
      Math.ceil((attempts.resetAt - Date.now()) / 1000),
      'Too many login attempts. Please try again later.',
    )
  }

  let payload: Record<string, unknown> | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400, headers: NO_STORE })
  }

  // Reject non-object bodies (`null`, arrays, scalars) up front — property
  // access on `null` would otherwise throw a 500.
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400, headers: NO_STORE })
  }

  // The reference contract sends { username, password }; the current UI collects
  // an email address, so `email` is accepted as an alias for the same identifier.
  const rawIdentifier =
    typeof payload.username === 'string' && payload.username
      ? payload.username
      : typeof payload.email === 'string'
        ? payload.email
        : ''

  const username = sanitize(rawIdentifier)
  const password = typeof payload.password === 'string' ? payload.password : ''

  if (!username) {
    return NextResponse.json({ message: 'Username required' }, { status: 400, headers: NO_STORE })
  }
  if (username.length > MAX_IDENTIFIER_LENGTH) {
    return NextResponse.json({ message: 'Username too long.' }, { status: 400, headers: NO_STORE })
  }
  if (!password) {
    return NextResponse.json({ message: 'Password required' }, { status: 400, headers: NO_STORE })
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ message: 'Password too long.' }, { status: 400, headers: NO_STORE })
  }

  const identifier = username.toLowerCase()
  const failuresKey = `login:fail:${identifier}`

  // Lock the identifier out after repeated failed attempts. The counter is
  // keyed on the submitted identifier whether or not the account exists, so
  // the lockout cannot be used to tell real accounts from fake ones.
  const lock = isBlocked(failuresKey)
  if (lock.blocked) {
    return rateLimited(lock.retryAfterSec, 'Too many failed login attempts. Please try again later.')
  }

  // Uniform latency for every credential check (success and failure alike),
  // so response timing cannot reveal whether the identifier exists.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

  const secure = request.url.startsWith('https://')

  // First, attempt authentication with original backend at http://localhost:5050/api/auth/login
  try {
    const backendRes = await fetch(ORIGINAL_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email: username, password }),
      signal: AbortSignal.timeout(4000),
    })

    if (backendRes.ok) {
      clear(failuresKey)
      const data = await backendRes.json().catch(() => ({}))
      const responseHeaders = new Headers({
        ...NO_STORE,
        'Set-Cookie': sessionCookie(createSessionToken(identifier), secure),
      })
      const backendCookie = backendRes.headers.get('set-cookie')
      if (backendCookie) {
        responseHeaders.append('Set-Cookie', backendCookie)
      }
      return NextResponse.json(
        { ok: true, user: { username }, ...data },
        { headers: responseHeaders },
      )
    }

    if (backendRes.status === 401 || backendRes.status === 403 || backendRes.status === 400) {
      count(failuresKey, MAX_FAILURES_PER_IDENTIFIER, WINDOW_MS)
      const data = await backendRes.json().catch(() => ({}))
      return NextResponse.json(
        { message: data.message || data.error || INVALID_CREDENTIALS },
        { status: backendRes.status, headers: NO_STORE },
      )
    }
  } catch {
    // Backend on http://localhost:5050/api/auth/login is unreachable; fall back to local mock store
  }

  const expected = MOCK_USERS[identifier]

  if (!expected || !safeMatch(password, expected)) {
    count(failuresKey, MAX_FAILURES_PER_IDENTIFIER, WINDOW_MS)
    return NextResponse.json({ message: INVALID_CREDENTIALS }, { status: 401, headers: NO_STORE })
  }

  clear(failuresKey)

  return NextResponse.json(
    { ok: true, user: { username } },
    { headers: { ...NO_STORE, 'Set-Cookie': sessionCookie(createSessionToken(identifier), secure) } },
  )
}
