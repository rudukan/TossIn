'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()

    const run = async () => {
      // Modern flow: ?token_hash=...&type=magiclink
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: type as any,
        })
        if (error) {
          setError(error.message)
          return
        }
        router.replace('/')
        return
      }

      // Legacy flow: #access_token=... (auto-detected)
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/')
        return
      }

      // Wait for auth state change as fallback
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          router.replace('/')
        }
      })
      return () => sub.subscription.unsubscribe()
    }

    run()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center">
      {error ? (
        <div className="text-center">
          <p className="text-sm text-terminal-red">Giriş başarısız: {error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="mt-4 rounded-full bg-[#2AABEE] px-4 py-2 text-sm text-white"
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-terminal-border border-t-[#2AABEE]" />
      )}
    </div>
  )
}
