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

  // Board needs more room for 4 columns
  const maxWidth = pathname === '/board' ? 'max-w-6xl' : 'max-w-3xl'

  return (
    <>
      <CaptureBar
        maxWidth={maxWidth}
        onCapture={async (content) => {
          const { error } = await createNote(content)
          if (error) console.error('Not oluşturulamadı:', error.message)
        }}
      />
      <main className={`mx-auto w-full ${maxWidth} flex-1 px-4 py-4`}>
        {children}
      </main>
      <NavBar inboxCount={inboxNotes.length} maxWidth={maxWidth} />
      <CommandPalette onCreateNote={async (content) => {
        const { error } = await createNote(content)
        if (error) console.error('Not oluşturulamadı:', error.message)
      }} />
    </>
  )
}
