'use client'

import { useNotes } from '@/lib/hooks/useNotes'
import NoteCard from '@/components/NoteCard'
import NudgeBanner from '@/components/NudgeBanner'

export default function InboxPage() {
  const { notes, loading, updateNote, deleteNote } = useNotes('inbox')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-terminal-green cursor-blink text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-sm font-bold text-terminal-green glow-green tracking-wider">
          <span className="text-terminal-muted">$</span> INBOX
        </h1>
        <span className="text-[11px] text-terminal-muted">[{notes.length}]</span>
      </div>

      <NudgeBanner count={notes.length} />

      {notes.length === 0 ? (
        <div className="py-20 text-center text-xs text-terminal-muted">
          -- inbox bos -- <br />
          <span className="text-terminal-green/50">yukaridan bir not toss et</span>
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
