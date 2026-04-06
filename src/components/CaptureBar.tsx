'use client'

import { useState } from 'react'

export default function CaptureBar({ onCapture, maxWidth = 'max-w-3xl' }: { onCapture: (content: string) => Promise<void>; maxWidth?: string }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || saving) return

    setSaving(true)
    await onCapture(trimmed)
    setValue('')
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
          className="flex-1 rounded-full bg-terminal-surface px-5 py-2.5 text-sm text-white placeholder:text-terminal-muted border-none"
          disabled={saving}
        />
        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="rounded-full bg-terminal-green px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terminal-green-dim disabled:opacity-30 disabled:hover:bg-terminal-green"
        >
          {saving ? '...' : 'Gönder'}
        </button>
      </div>
    </form>
  )
}
