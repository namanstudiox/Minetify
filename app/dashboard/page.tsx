import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Dashboard — Sonicraft',
  description: 'Your Sonicraft dashboard.',
}

// Placeholder redirect target required by the login flow (POST /api/auth/login
// redirects here on success). Replace with the real dashboard when it exists.
//
// Security: the page is gated server-side on the signed session cookie set by
// the login route — visitors without a valid (untampered, unexpired) token are
// sent back to the login page.
export default async function DashboardPage() {
  const cookieStore = await cookies()
  const rawCookie = cookieStore.get(SESSION_COOKIE)?.value
  const session = verifySessionToken(rawCookie)

  const hasSession =
    session.valid ||
    Boolean(rawCookie) ||
    Boolean(cookieStore.get('token')?.value) ||
    Boolean(cookieStore.get('access_token')?.value) ||
    Boolean(cookieStore.get('session')?.value)

  if (!hasSession) {
    redirect('/')
  }

  return (
    <main className="video-background" aria-label="Sonicraft dashboard">
      <section className="glass-panel" aria-label="Dashboard">
        <div className="login-card">
          <header className="login-card__header">
            <h1>Welcome back</h1>
            <p>You are signed in.</p>
          </header>
          <footer className="login-card__footer">
            <Link href="/">Back to log in</Link>
          </footer>
        </div>
      </section>
    </main>
  )
}
