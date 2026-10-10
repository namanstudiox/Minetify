import type { Metadata } from 'next'
import SignupForm from '@/components/signup-form'

export const metadata: Metadata = {
  title: 'Create your account — Sonicraft',
  description: 'Join Sonicraft and make room for what moves you.',
}

export default function SignupPage() {
  return <SignupForm />
}
