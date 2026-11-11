'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'

export default function CaptureBar({ onCapture, maxWidth = 'max-w-3xl' }: { onCapture: (content: string) => Promise<boolean>; maxWidth?: string }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const { signOut } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || saving) return

    setSaving(true)
    const saved = await onCapture(trimmed)
    if (saved) setValue('')
    setSaving(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky top-0 z-20 border-b border-terminal-border bg-[#17212b]/95 backdrop-blur-md"
    >
      <div className={`mx-auto flex w-full ${maxWidth} items-center gap-2 px-4 py-3`}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Aklına ne geldi?"
          className="min-w-0 flex-1 rounded-full bg-terminal-surface px-4 py-2.5 text-sm sm:px-5 text-white placeholder:text-terminal-muted border-none"
          disabled={saving}
        />
        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="shrink-0 rounded-full bg-terminal-green px-4 py-2.5 sm:px-5 text-sm font-semibold text-white transition-all hover:bg-terminal-green-dim disabled:opacity-30 disabled:hover:bg-terminal-green"
        >
          {saving ? '...' : 'Gönder'}
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          title="Çıkış"
          className="shrink-0 rounded-full p-2.5 text-terminal-muted transition-colors hover:bg-terminal-surface hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </form>
  )
}
