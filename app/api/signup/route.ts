import { NextResponse } from 'next/server'
import { clientIp, count } from '@/lib/rate-limit'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 1024

const WINDOW_MS = 15 * 60 * 1000
const MAX_SIGNUPS_PER_IP = 10
const MOCK_LATENCY_MS = 300

const NO_STORE = { 'Cache-Control': 'no-store' }

function rateLimited(retryAfterSec: number, message: string) {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec), ...NO_STORE } },
  )
}

export async function POST(request: Request) {
  const attempts = count(`signup:ip:${clientIp(request)}`, MAX_SIGNUPS_PER_IP, WINDOW_MS)
  if (attempts.count > MAX_SIGNUPS_PER_IP) {
    return rateLimited(
      Math.ceil((attempts.resetAt - Date.now()) / 1000),
      'Too many requests. Please try again later.',
    )
  }

  let payload: Record<string, unknown> | null = null

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: NO_STORE })
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: NO_STORE })
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''
  const confirmPassword = typeof payload.confirmPassword === 'string' ? payload.confirmPassword : ''

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400, headers: NO_STORE })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: NO_STORE })
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: 'Password is too long.' }, { status: 400, headers: NO_STORE })
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400, headers: NO_STORE })
  }

  // Mock persistence — swap this block for a real database / auth call.
  //
  // Security: the response is deliberately identical whether or not the
  // address is already registered (no 409), so signup cannot be used to
  // enumerate which accounts exist. Keep it that way when adding real storage.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

  return NextResponse.json(
    { ok: true, message: 'Account created. You can now log in.' },
    { headers: NO_STORE },
  )
}
