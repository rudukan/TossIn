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
    <form onSubmit={handleSubmit} className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Aklina ne geldi?"
          className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
          disabled={saving}
        />
        <button
          type="submit"
          disabled={!value.trim() || saving}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? '...' : 'At'}
        </button>
      </div>
    </form>
  )
}
