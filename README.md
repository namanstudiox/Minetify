# Sonicraft — Authentication & Onboarding Portal

A modern, responsive, and secure authentication suite built for **Sonicraft** (*"Make room for what moves you"*). Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4, featuring a frosted glassmorphic aesthetic over an ambient full-bleed looping video background.

---

## 🌟 Overview

This repository provides a complete, production-ready frontend and mock backend authentication architecture. It includes sign-in, user registration, password recovery, and a server-side protected dashboard route, all hardened with enterprise-grade defensive security patterns.

---

## ✨ Features

- **Ambient Glassmorphism Interface**: Fullscreen auto-playing video background (`/background.mp4`) with a dark gradient scrim and frosted backdrop glass panel (`backdrop-filter: blur(16px)`).
- **Comprehensive Authentication Flows**:
  - **Login (`/`)**: Dual-mode login interface supporting credentials and Google sign-in placeholder.
  - **Sign Up (`/signup`)**: Account creation with real-time validation (minimum 8-character password length and confirmation match).
  - **Password Reset**: In-card toggleable reset form that triggers recovery links without page reloads.
  - **Protected Dashboard (`/dashboard`)**: Server-rendered route gated via HMAC-signed session cookies with automatic redirects for unauthenticated visitors.
- **Defensive Security & Hardening**:
  - **Timing-Safe Verification**: Passwords checked via constant-time SHA-256 hashing using Node's `crypto.timingSafeEqual` to thwart timing side-channel attacks.
  - **Anti-Enumeration Protections**: Uniform responses, non-differentiating error messages, and artificial constant latencies (`300ms`) across valid and invalid accounts.
  - **Multi-Tier Rate Limiting**: In-memory fixed-window rate limiter protecting against brute-force attacks:
    - Global limit: 300 requests / 15 minutes.
    - Per-IP login limit: 60 requests / 15 minutes.
    - Per-identifier lockout: 5 consecutive failures per account.
    - Signup limit: 10 requests / 15 minutes per IP.
    - Reset password limit: 5 requests / 15 minutes per IP.
    - Standard `429 Too Many Requests` responses with `Retry-After` headers.
  - **HMAC-SHA256 Signed Session Cookies**: Tamper-proof session tokens stored in `HttpOnly`, `SameSite=Lax` cookies with dynamic `Secure` enforcement on HTTPS.
  - **HTTP Security Headers**: Baseline headers injected via `next.config.mjs` (`nosniff`, `DENY` framing, strict referrer policy, restrictive permissions policy).

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16.4.0](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **UI Library** | [React 19](https://react.dev/), [@base-ui/react](https://base-ui.com/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/), `@tailwindcss/postcss`, `tw-animate-css` |
| **Icons & Design** | [Lucide React](https://lucide.dev/), shadcn/ui conventions |
| **Language** | [TypeScript 5.7.3](https://www.typescriptlang.org/) |
| **Cryptography** | Node.js native `crypto` module (HMAC-SHA256, `timingSafeEqual`) |
| **Package Manager** | `pnpm` / `npm` |

---

## 📁 Project Structure

```text
login/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── route.ts         # Login endpoint (rate limit, timing-safe auth, cookies)
│   │   ├── forgot-password/
│   │   │   └── route.ts         # Password recovery endpoint with per-IP throttling
│   │   └── signup/
│   │       └── route.ts         # User registration endpoint with anti-enumeration response
│   ├── dashboard/
│   │   └── page.tsx             # Protected dashboard gated on verified session cookie
│   ├── signup/
│   │   └── page.tsx             # Dedicated sign-up route
│   ├── globals.css              # Tailwind imports, custom glassmorphism & layout styles
│   ├── layout.tsx               # Root layout, viewport settings, metadata
│   └── page.tsx                 # Login & inline forgot-password portal
├── components/
│   ├── ui/
│   │   └── button.tsx           # Base UI button with class-variance-authority variants
│   └── signup-form.tsx          # Client-side sign up form component
├── lib/
│   ├── rate-limit.ts            # In-memory fixed-window bucket rate limiter with pruning
│   ├── session.ts               # HMAC-SHA256 session token generator & cookie builder
│   └── utils.ts                 # Class merger utility (clsx + tailwind-merge)
├── public/
│   ├── background.mp4           # High-definition looping ambient background video
│   ├── google-logo.svg          # Google brand asset
│   └── ...                      # App icons, favicons, and placeholder assets
├── components.json              # shadcn component configuration
├── next.config.mjs              # Next.js build config & HTTP security headers
├── package.json                 # Dependencies and npm scripts
├── postcss.config.mjs           # PostCSS configuration for Tailwind CSS v4
├── tsconfig.json                # TypeScript compiler configuration
└── README.md                    # Project documentation
```

---

## 🔑 Demo Credentials

To test the login flow directly in development, use the pre-configured mock credentials:

| Field | Value |
| :--- | :--- |
| **Username / Email** | `demo` or `demo@sonicraft.app` |
| **Password** | `password123` |

Upon successful authentication, the server generates an HMAC-signed session cookie and redirects you to the protected [`/dashboard`](file:///C:/Users/Nova/Desktop/login/app/dashboard/page.tsx).

---

---

## 📡 API Reference & Backend Integration

> [!NOTE]
> **Original Backend Configuration**: The application is configured to authenticate against the original backend endpoint at **`http://localhost:5050/api/auth/login`** (replacing the legacy port `8000`).

The authentication architecture supports a hybrid connection strategy:
1. **Direct Client Call**: The login form (`app/page.tsx`) dispatches credentials directly to `http://localhost:5050/api/auth/login` (configured via `NEXT_PUBLIC_LOGIN_URL`).
2. **Server-Side Proxy Route**: If the direct call encounters CORS restrictions or requires token synchronization, the Next.js API route (`app/api/auth/login/route.ts`) forwards the request server-to-server to `http://localhost:5050/api/auth/login` (configured via `AUTH_API_URL`).
3. **Local Dev Fallback**: If the server on port 5050 is not yet running during local UI development, it gracefully falls back to mock demo credentials (`demo` / `password123`).

### 1. `POST http://localhost:5050/api/auth/login` (Original Endpoint)
Primary backend login endpoint.

- **Request Body**:
  ```json
  {
    "username": "demo@sonicraft.app",
    "email": "demo@sonicraft.app",
    "password": "password123"
  }
  ```
- **Responses**:
  - `200 OK`: Successful authentication (returns user details / JWT token).
  - `400 Bad Request`: Validation failure.
  - `401 Unauthorized`: Invalid credentials.

### 2. `POST /api/auth/login` (Next.js Internal Proxy & Gateway)
Authenticates against `http://localhost:5050/api/auth/login` and issues a signed session cookie.

- **Request Body**:
  ```json
  {
    "username": "demo@sonicraft.app",
    "password": "password123"
  }
  ```
- **Responses**:
  - `200 OK`: Returns `{ ok: true, user: { username } }` and sets `sonicraft_session` cookie.
  - `400 Bad Request`: Missing or invalid input fields.
  - `401 Unauthorized`: Invalid credentials (constant-time response).
  - `429 Too Many Requests`: Rate limit or lockout exceeded.

### 3. `POST /api/signup`
Registers a new account.

- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }
  ```
- **Responses**:
  - `200 OK`: `{ ok: true, message: "Account created. You can now log in." }`
  - `400 Bad Request`: Validation failure (email format, password length < 8, password mismatch).
  - `429 Too Many Requests`: Exceeded sign-up attempt threshold.

### 4. `POST /api/forgot-password`
Triggers a password recovery email.

- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Responses**:
  - `200 OK`: Generic success confirmation (anti-enumeration).
  - `400 Bad Request`: Invalid email format.
  - `429 Too Many Requests`: Exceeded password reset request limit.

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root (see [`.env.example`](file:///C:/Users/Nova/Desktop/login/.env.example)):

```env
# Original Backend Login Endpoint (Replaces port 8000)
NEXT_PUBLIC_LOGIN_URL="http://localhost:5050/api/auth/login"
AUTH_API_URL="http://localhost:5050/api/auth/login"

# Cryptographic secret used to sign and verify HMAC session tokens
# Generate with: openssl rand -hex 32
SESSION_SECRET="your-secure-random-secret-key-here"
```

> [!WARNING]
> If `SESSION_SECRET` is omitted, the application falls back to a development secret. Always provide a strong random secret in staging and production environments.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 20 or higher recommended)
- [pnpm](https://pnpm.io/) (v9+ / v12+) or [npm](https://www.npmjs.com/)

### 1. Install Dependencies

Using `pnpm`:
```bash
pnpm install
```

Or using `npm`:
```bash
npm install
```

### 2. Run the Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 3. Build for Production

```bash
pnpm build
pnpm start
# or
npm run build
npm run start
```

---

## 🛡️ Production Readiness Checklist

When moving from this standalone demo to a production deployment, consider the following enhancements:

- [ ] **Persistent Rate Limiting**: Replace the in-memory `Map` in [`lib/rate-limit.ts`](file:///C:/Users/Nova/Desktop/login/lib/rate-limit.ts) with a distributed store (e.g., Redis, Upstash, or database) to preserve rate limits across serverless instances or multi-container clusters.
- [ ] **Database Integration**: Connect [`app/api/auth/login/route.ts`](file:///C:/Users/Nova/Desktop/login/app/api/auth/login/route.ts) and [`app/api/signup/route.ts`](file:///C:/Users/Nova/Desktop/login/app/api/signup/route.ts) to a database (PostgreSQL, Prisma, Drizzle, etc.) with Argon2id or bcrypt password hashing.
- [ ] **Email Provider Integration**: Wire [`app/api/forgot-password/route.ts`](file:///C:/Users/Nova/Desktop/login/app/api/forgot-password/route.ts) to an email service (Resend, SendGrid, Postmark) to dispatch cryptographic reset tokens.
- [ ] **OAuth Authentication**: Connect the "Log in with Google" button to an OAuth 2.0 flow via Auth.js / NextAuth or a dedicated identity provider.
- [ ] **HSTS Header**: Enable `Strict-Transport-Security` in `next.config.mjs` once deployed exclusively over HTTPS.

---

## 📄 License

Private and proprietary. All rights reserved.
