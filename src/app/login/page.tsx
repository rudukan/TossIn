'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signInWithPassword(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@mail.com"
            required
            autoFocus
            autoComplete="username"
            className="w-full rounded-full border border-terminal-border bg-terminal-surface px-5 py-3 text-sm text-white placeholder:text-terminal-muted outline-none transition-colors focus:border-[#2AABEE]"
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            required
            autoComplete="current-password"
            className="w-full rounded-full border border-terminal-border bg-terminal-surface px-5 py-3 text-sm text-white placeholder:text-terminal-muted outline-none transition-colors focus:border-[#2AABEE]"
          />
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
