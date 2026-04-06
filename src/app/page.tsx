'use client'

import { useNotes } from '@/lib/hooks/useNotes'
import NoteCard from '@/components/NoteCard'
import NudgeBanner from '@/components/NudgeBanner'

export default function InboxPage() {
  const { notes, loading, updateNote, deleteNote } = useNotes('inbox')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-terminal-border border-t-terminal-green" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-white">Inbox</h1>
        <span className="text-xs text-terminal-muted">{notes.length} not</span>
      </div>

      <NudgeBanner count={notes.length} />

      {notes.length === 0 ? (
        <div className="py-20 text-center text-sm text-terminal-muted">
          Inbox boş.<br />
          <span className="text-terminal-green">Yukarıdan bir not ekle.</span>
        </div>
      ) : (
        <div className="space-y-2">
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
