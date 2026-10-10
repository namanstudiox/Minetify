'use client'

import { useState } from 'react'
import Link from 'next/link'

const videoSource = '/background.mp4'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim()) {
      setStatus('error')
      setMessage('Enter your email address.')
      return
    }
    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }

    setStatus('submitting')
    setMessage('')

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, confirmPassword }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      // Prefer the server's wording: the response is deliberately identical
      // whether or not the address was already registered (anti-enumeration).
      setMessage(data.message ?? 'Account created. You can now log in.')
    } catch {
      setStatus('error')
      setMessage('Could not reach the server. Please try again.')
    }
  }

  const isBusy = status === 'submitting'

  return (
    <main className="video-background" aria-label="Ambient video background">
      <video
        className="video-background__media"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src={videoSource} type="video/mp4" />
      </video>
      <div className="video-background__scrim" aria-hidden="true" />
      <section className="glass-panel" aria-label="Create your Sonicraft account">
        <div className="login-card">
          <header className="login-card__header">
            <h1>Create your account</h1>
            <p>
              Already have an account?{' '}
              <Link href="/">Log in</Link>
            </p>
          </header>

          {message && (
            <p
              className={`form-status ${status === 'error' ? 'form-status--error' : status === 'success' ? 'form-status--success' : ''}`}
              role={status === 'error' ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}

          <form className="login-form" method="post" action="/api/signup" onSubmit={handleSubmit}>
            <button className="google-button" type="button">
              <img className="google-mark" src="/google-logo.svg" alt="" aria-hidden="true" />
              <span>Sign up with Google</span>
            </button>

            <div className="or-divider" aria-hidden="true"><span>OR</span></div>

            <div className="form-field">
              <label htmlFor="signup-email">EMAIL</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-field form-field--password">
              <div className="password-label-row">
                <label htmlFor="signup-password">PASSWORD</label>
              </div>
              <div className="password-input">
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <span aria-hidden="true">◉</span>
              </div>
            </div>

            <div className="form-field form-field--password">
              <label htmlFor="confirm-password">CONFIRM PASSWORD</label>
              <div className="password-input">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <span aria-hidden="true">◉</span>
              </div>
            </div>

            <button className="submit-button" type="submit" disabled={isBusy || status === 'success'}>
              {status === 'submitting' ? 'Creating account…' : status === 'success' ? 'Account created' : 'Create account'}
            </button>
          </form>

          <footer className="login-card__footer">
            <a href="#terms">Terms of Service</a>
            <a href="#privacy">Privacy Policy</a>
          </footer>
        </div>
      </section>
    </main>
  )
}
