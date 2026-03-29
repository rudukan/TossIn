'use client'

import { useNotes } from '@/lib/hooks/useNotes'
import NoteCard from '@/components/NoteCard'
import NudgeBanner from '@/components/NudgeBanner'

export default function InboxPage() {
  const { notes, loading, updateNote, deleteNote } = useNotes('inbox')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Inbox</h1>
        <span className="text-sm text-zinc-400">{notes.length} not</span>
      </div>

      <NudgeBanner count={notes.length} />

      {notes.length === 0 ? (
        <div className="py-20 text-center text-sm text-zinc-400">
          Inbox bos. Yukaridan bir not at!
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              showTypeChanger
              onUpdateType={(type) => updateNote(note.id, { type })}
              onToggleStar={() => updateNote(note.id, { is_starred: !note.is_starred })}
              onAddTag={(tag) => {
                if (!note.tags.includes(tag)) {
                  updateNote(note.id, { tags: [...note.tags, tag] })
                }
              }}
              onRemoveTag={(tag) => updateNote(note.id, { tags: note.tags.filter((t) => t !== tag) })}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
