import { NextResponse } from 'next/server'
import { clientIp, count } from '@/lib/rate-limit'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS_PER_IP = 5
const MOCK_LATENCY_MS = 300

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  // Throttle per IP so the endpoint cannot be used to bombard victims with
  // reset emails.
  const attempts = count(`forgot:ip:${clientIp(request)}`, MAX_REQUESTS_PER_IP, WINDOW_MS)
  if (attempts.count > MAX_REQUESTS_PER_IP) {
    const retryAfterSec = Math.ceil((attempts.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec), ...NO_STORE } },
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

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400, headers: NO_STORE })
  }

  // Mock delivery — replace with a real email provider / password-reset service.
  // The response is intentionally identical whether or not the address exists,
  // so the endpoint cannot be used to probe which accounts are registered.
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

  return NextResponse.json(
    {
      ok: true,
      message: `If an account exists for ${email}, a reset link has been sent.`,
    },
    { headers: NO_STORE },
  )
}
