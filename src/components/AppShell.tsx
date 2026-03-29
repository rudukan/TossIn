'use client'

import { usePathname } from 'next/navigation'
import { useNotes } from '@/lib/hooks/useNotes'
import CaptureBar from './CaptureBar'
import NavBar from './NavBar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { notes: inboxNotes, createNote } = useNotes('inbox')

  // Login page — no shell
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <>
      <CaptureBar onCapture={async (content) => {
        const { error } = await createNote(content)
        if (error) console.error('Not oluşturulamadı:', error.message)
      }} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
        {children}
      </main>
      <NavBar inboxCount={inboxNotes.length} />
    </>
  )
}
