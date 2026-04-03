'use client'

import { useNotes } from '@/lib/hooks/useNotes'
import KanbanBoard from '@/components/KanbanBoard'

export default function BoardPage() {
  const { notes, loading, updateNote, deleteNote } = useNotes()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-terminal-green cursor-blink text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-sm font-bold text-terminal-green glow-green tracking-wider">
        <span className="text-terminal-muted">$</span> BOARD
      </h1>
      <KanbanBoard
        notes={notes}
        onUpdateType={(id, type) => updateNote(id, { type })}
        onDelete={(id) => deleteNote(id)}
      />
    </div>
  )
}
