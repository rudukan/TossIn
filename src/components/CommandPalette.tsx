'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Command {
  id: string
  label: string
  shortcut?: string
  action: () => void
  category: string
}

export default function CommandPalette({ onCreateNote }: { onCreateNote: (content: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const commands: Command[] = [
    { id: 'nav-inbox', label: '/inbox', shortcut: '1', action: () => router.push('/'), category: 'NAV' },
    { id: 'nav-board', label: '/board', shortcut: '2', action: () => router.push('/board'), category: 'NAV' },
    { id: 'nav-search', label: '/search', shortcut: '3', action: () => router.push('/search'), category: 'NAV' },
  ]

  const filtered = query.trim()
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  const isNoteMode = query.trim() && filtered.length === 0

  const execute = useCallback((cmd?: Command) => {
    if (cmd) {
      cmd.action()
      setOpen(false)
      setQuery('')
    } else if (isNoteMode && query.trim()) {
      onCreateNote(query.trim())
      setOpen(false)
      setQuery('')
    }
  }, [isNoteMode, query, onCreateNote])

  // Ctrl+K / Cmd+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery('')
        setSelectedIndex(0)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (isNoteMode) {
          execute()
        } else if (filtered[selectedIndex]) {
          execute(filtered[selectedIndex])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selectedIndex, isNoteMode, execute])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery('') }}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-2xl border border-terminal-border bg-terminal-surface shadow-2xl shadow-black/50 overflow-hidden">
        {/* Input */}
        <div className="flex items-center border-b border-terminal-border px-4 py-3">
          <svg className="mr-3 h-4 w-4 text-terminal-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Komut ara veya yeni not yaz..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-terminal-muted border-none"
          />
          <span className="text-[10px] text-terminal-muted rounded-md bg-terminal-surface-hover px-1.5 py-0.5">ESC</span>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto p-2">
          {isNoteMode ? (
            <div className="px-3 py-3">
              <span className="text-[11px] text-terminal-muted">Enter ile yeni not olarak kaydet:</span>
              <p className="mt-1 text-sm text-white">{query}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-terminal-muted">
              Sonuç yok
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === selectedIndex
                    ? 'bg-terminal-green/15 text-white'
                    : 'text-white/80 hover:bg-terminal-surface-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-terminal-muted">{cmd.category}</span>
                  <span>{cmd.label}</span>
                </div>
                {cmd.shortcut && (
                  <span className="text-[10px] text-terminal-muted rounded-md bg-terminal-surface-hover px-1.5 py-0.5">{cmd.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-terminal-border px-4 py-2">
          <span className="text-[10px] text-terminal-muted">
            <span className="rounded bg-terminal-surface-hover px-1 py-0.5 mr-1">↑↓</span> gezin
          </span>
          <span className="text-[10px] text-terminal-muted">
            <span className="rounded bg-terminal-surface-hover px-1 py-0.5 mr-1">↵</span> çalıştır
          </span>
          <span className="text-[10px] text-terminal-muted">
            <span className="rounded bg-terminal-surface-hover px-1 py-0.5 mr-1">esc</span> kapat
          </span>
        </div>
      </div>
    </div>
  )
}
