'use client'

import { useState } from 'react'

export default function CaptureBar({ onCapture }: { onCapture: (content: string) => Promise<void> }) {
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
      className="sticky top-0 z-20 border-b border-terminal-border bg-black/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-0 px-4 py-3">
        <span className="glow-green mr-2 text-terminal-green font-bold select-none">&gt;</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="toss bir not..."
          className="flex-1 bg-transparent text-terminal-green placeholder:text-terminal-muted caret-terminal-green border-none"
          disabled={saving}
        />
        {!value.trim() && !saving && (
          <span className="cursor-blink text-terminal-green select-none">_</span>
        )}
        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="ml-3 border border-terminal-green/30 px-3 py-1 text-xs text-terminal-green transition-all hover:bg-terminal-green/10 hover:border-terminal-green/60 disabled:opacity-20 disabled:hover:bg-transparent"
        >
          {saving ? '...' : 'ENTER'}
        </button>
      </div>
    </form>
  )
}
