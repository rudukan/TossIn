'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useNotes } from '@/lib/hooks/useNotes'
import { useAuth } from '@/lib/hooks/useAuth'
import CaptureBar from './CaptureBar'
import NavBar from './NavBar'
import CommandPalette from './CommandPalette'

const PUBLIC_PATHS = ['/login', '/landing', '/auth/callback']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { notes: inboxNotes, createNote } = useNotes('inbox')

  const isPublic = PUBLIC_PATHS.includes(pathname)

  // Redirect unauth users to /login (except public pages)
  useEffect(() => {
    if (!authLoading && !user && !isPublic) {
      router.replace('/login')
    }
  }, [authLoading, user, isPublic, router, pathname])

  // Public pages: no shell
  if (isPublic) {
    return <>{children}</>
  }

  // Loading auth or redirecting
  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-terminal-border border-t-[#2AABEE]" />
      </div>
    )
  }

  // Board needs more room for 4 columns
  const maxWidth = pathname === '/board' ? 'max-w-6xl' : 'max-w-3xl'

  return (
    <>
      <CaptureBar
        onCapture={async (content) => {
          const { error } = await createNote(content)
          if (error) console.error('Not oluşturulamadı:', error)
        }}
      />
      <main className={`mx-auto w-full ${maxWidth} flex-1 px-4 py-4`}>
        {children}
      </main>
      <NavBar inboxCount={inboxNotes.length} />
      <CommandPalette onCreateNote={async (content) => {
        const { error } = await createNote(content)
        if (error) console.error('Not oluşturulamadı:', error)
      }} />
    </>
  )
}
