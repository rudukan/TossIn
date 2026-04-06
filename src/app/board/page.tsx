'use client'

import { useNotes } from '@/lib/hooks/useNotes'
import KanbanBoard from '@/components/KanbanBoard'

export default function BoardPage() {
  const { notes, loading, updateNote, deleteNote } = useNotes()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-terminal-border border-t-terminal-green" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Board</h1>
      <KanbanBoard
        notes={notes}
        onUpdateType={(id, type) => updateNote(id, { type })}
        onDelete={(id) => deleteNote(id)}
      />
    </div>
  )
}
