'use client'

import { useState } from 'react'
import Link from 'next/link'

const videoSource = '/background.mp4'

type Status = 'idle' | 'submitting' | 'success' | 'error'

// Same sanitizer the reference implementation applies before submitting.
const sanitize = (value: string) => value.trim().replace(/[<>\"']/g, '')

// Primary original login backend endpoint (replaces port 8000)
const LOGIN_API_URL = process.env.NEXT_PUBLIC_LOGIN_URL || 'http://localhost:5050/api/auth/login'

export default function Page() {
  const [isForgot, setIsForgot] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginStatus, setLoginStatus] = useState<Status>('idle')
  const [loginMessage, setLoginMessage] = useState('')

  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState<Status>('idle')
  const [resetMessage, setResetMessage] = useState('')

  const backToLogin = () => {
    setIsForgot(false)
    setResetEmail('')
    setResetStatus('idle')
    setResetMessage('')
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim()) {
      setLoginStatus('error')
      setLoginMessage('Enter your email address.')
      return
    }
    if (!password) {
      setLoginStatus('error')
      setLoginMessage('Enter your password.')
      return
    }

    setLoginStatus('submitting')
    setLoginMessage('')

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: sanitize(email),
          email: sanitize(email),
          password,
        }),
      })

      if (response.ok) {
        document.cookie = `sonicraft_session=active_${Date.now()}; path=/; max-age=3600; SameSite=Lax`
        const data = await response.json().catch(() => ({}))
        if (data.token) {
          localStorage.setItem('auth_token', data.token)
          document.cookie = `token=${data.token}; path=/; max-age=3600; SameSite=Lax`
        }
        setLoginStatus('success')
        setLoginMessage('Login successful. Redirecting...')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
        return
      }

      const data = await response.json().catch(() => ({}))
      setLoginStatus('error')
      setLoginMessage(data.message || data.error || 'Login failed. Try again.')
    } catch {
      // If direct call fails (e.g. CORS or server not started), fallback to local API route
      try {
        const proxyResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: sanitize(email),
            email: sanitize(email),
            password,
          }),
        })

        if (proxyResponse.ok) {
          setLoginStatus('success')
          setLoginMessage('Login successful. Redirecting...')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1500)
          return
        }

        const proxyData = await proxyResponse.json().catch(() => ({}))
        setLoginStatus('error')
        setLoginMessage(proxyData.message || proxyData.error || 'Login failed. Try again.')
      } catch {
        setLoginStatus('error')
        setLoginMessage('Connection error. Could not connect to http://localhost:5050/api/auth/login.')
      }
    }
  }

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!resetEmail.trim()) {
      setResetStatus('error')
      setResetMessage('Enter your email address.')
      return
    }

    setResetStatus('submitting')
    setResetMessage('')

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setResetStatus('error')
        setResetMessage(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setResetStatus('success')
      setResetMessage(data.message ?? 'Reset link sent.')
    } catch {
      setResetStatus('error')
      setResetMessage('Could not reach the server. Please try again.')
    }
  }

  const statusClass = (status: Status) =>
    `form-status ${status === 'error' ? 'form-status--error' : status === 'success' ? 'form-status--success' : ''}`

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
      <section className="glass-panel" aria-label="Log in to Sonicraft">
        <div className="login-card">
          <header className="login-card__header">
            <h1>{isForgot ? 'Forgot password?' : 'Welcome Back'}</h1>
            <p>
              {isForgot ? 'Enter your email and we\'ll send you a reset link.' : "Don't have an account? "}
              {!isForgot && (
                <Link href="/signup">Sign up</Link>
              )}
            </p>
          </header>

          {isForgot ? (
            <form className="login-form" method="post" action="/api/forgot-password" onSubmit={handleReset}>
              {resetMessage && (
                <p className={statusClass(resetStatus)} role={resetStatus === 'error' ? 'alert' : 'status'}>
                  {resetMessage}
                </p>
              )}
              <div className="form-field">
                <label htmlFor="reset-email">EMAIL</label>
                <input
                  id="reset-email"
                  name="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                />
              </div>
              <button className="submit-button" type="submit" disabled={resetStatus === 'submitting' || resetStatus === 'success'}>
                {resetStatus === 'submitting' ? 'Sending reset link…' : resetStatus === 'success' ? 'Reset link sent' : 'Send reset link'}
              </button>
              <button className="back-link" type="button" onClick={backToLogin}>Back to log in</button>
            </form>
          ) : (
            <>
              {loginMessage && (
                <p className={statusClass(loginStatus)} role={loginStatus === 'error' ? 'alert' : 'status'}>
                  {loginMessage}
                </p>
              )}
              <form className="login-form" method="post" action={LOGIN_API_URL} onSubmit={handleLogin}>
                <button className="google-button" type="button">
                  <img className="google-mark" src="/google-logo.svg" alt="" aria-hidden="true" />
                  <span>Log in with Google</span>
                </button>

                <div className="or-divider" aria-hidden="true"><span>OR</span></div>

                <div className="form-field">
                  <label htmlFor="email">EMAIL</label>
                  <input
                    id="email"
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
                    <label htmlFor="password">PASSWORD</label>
                  </div>
                  <div className="password-input">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <span aria-hidden="true">◉</span>
                  </div>
                  <button className="forgot-link" type="button" onClick={() => setIsForgot(true)}>Forgot?</button>
                </div>

                <button className="submit-button" type="submit" disabled={loginStatus === 'submitting'}>
                  {loginStatus === 'submitting' ? 'Logging in…' : 'Log in'}
                </button>
              </form>
            </>
          )}

          <footer className="login-card__footer">
            <a href="#terms">Terms of Service</a>
            <a href="#privacy">Privacy Policy</a>
          </footer>
        </div>
      </section>
    </main>
  )
}
