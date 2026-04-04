'use client'

import { usePathname } from 'next/navigation'
import { useNotes } from '@/lib/hooks/useNotes'
import CaptureBar from './CaptureBar'
import NavBar from './NavBar'
import CommandPalette from './CommandPalette'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { notes: inboxNotes, createNote } = useNotes('inbox')

  // Login & Landing — no shell
  if (pathname === '/login' || pathname === '/landing') {
    return <>{children}</>
  }

  return (
    <>
      <CaptureBar onCapture={async (content) => {
        const { error } = await createNote(content)
        if (error) console.error('Not oluşturulamadı:', error.message)
      }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        {children}
      </main>
      <NavBar inboxCount={inboxNotes.length} />
      <CommandPalette onCreateNote={async (content) => {
        const { error } = await createNote(content)
        if (error) console.error('Not oluşturulamadı:', error.message)
      }} />
    </>
  )
}
