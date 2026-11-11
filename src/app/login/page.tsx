'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

// Only the e-mail is remembered. The password is never stored by the app;
// the browser's password manager fills it.
const EMAIL_KEY = 'tossin-email'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithPassword } = useAuth()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Bring back the remembered e-mail and jump straight to the password
  useEffect(() => {
    const saved = window.localStorage.getItem(EMAIL_KEY)
    if (saved && emailRef.current && !emailRef.current.value) {
      emailRef.current.value = saved
      passwordRef.current?.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = emailRef.current?.value.trim() ?? ''
    setError('')
    setLoading(true)
    const { error } = await signInWithPassword(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      if (remember) {
        window.localStorage.setItem(EMAIL_KEY, email)
      } else {
        window.localStorage.removeItem(EMAIL_KEY)
      }
      router.replace('/')
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-white">Toss</span>
            <span className="text-[#2AABEE]">In</span>
          </h1>
          <p className="mt-3 text-sm text-terminal-muted">Giriş yap</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            name="email"
            ref={emailRef}
            placeholder="ornek@mail.com"
            required
            autoFocus
            autoComplete="username"
            className="w-full rounded-full border border-terminal-border bg-terminal-surface px-5 py-3 text-sm text-white placeholder:text-terminal-muted outline-none transition-colors focus:border-[#2AABEE]"
          />
          <input
            type="password"
            name="password"
            ref={passwordRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            required
            autoComplete="current-password"
            className="w-full rounded-full border border-terminal-border bg-terminal-surface px-5 py-3 text-sm text-white placeholder:text-terminal-muted outline-none transition-colors focus:border-[#2AABEE]"
          />
          <label className="flex items-center gap-2 px-2 text-xs text-terminal-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[#2AABEE]"
            />
            Beni hatırla
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#2AABEE] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E96D4] disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
          {error && (
            <p className="text-center text-xs text-terminal-red">{error}</p>
          )}
        </form>
      </div>
    </div>
  )
}
