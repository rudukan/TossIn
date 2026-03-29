'use client'

import { useNotes } from '@/lib/hooks/useNotes'
import KanbanBoard from '@/components/KanbanBoard'

export default function BoardPage() {
  const { notes, loading, updateNote, deleteNote } = useNotes()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Board</h1>
      <KanbanBoard
        notes={notes}
        onUpdateType={(id, type) => updateNote(id, { type })}
        onDelete={(id) => deleteNote(id)}
      />
    </div>
  )
}
