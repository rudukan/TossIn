'use client'

import { useEffect } from 'react'
import { useToast } from '@/lib/NotesProvider'

const VISIBLE_MS = 5000

export default function Toast() {
  const { toast, dismissToast } = useToast()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismissToast, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
      <div
        role={toast.kind === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex items-center gap-4 rounded-xl border px-4 py-3 text-sm text-white shadow-2xl shadow-black/40 ${
          toast.kind === 'error'
            ? 'border-terminal-red/50 bg-[#3a2326]'
            : 'border-terminal-surface-hover bg-terminal-surface'
        }`}
      >
        <span>{toast.message}</span>
        {toast.onUndo && (
          <button
            onClick={toast.onUndo}
            className="font-semibold text-terminal-green hover:underline"
          >
            Geri al
          </button>
        )}
      </div>
    </div>
  )
}
