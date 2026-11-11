'use client'

import { useMemo, useState } from 'react'
import { useNotes } from '@/lib/hooks/useNotes'
import NoteCard from '@/components/NoteCard'
import TagPill from '@/components/TagPill'

export default function SearchPage() {
  const { notes, loading, updateNote, deleteNote } = useNotes()
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    notes.forEach((n) => n.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [notes])

  // All notes are already in memory, so filter as the user types
  const needle = query.trim().toLocaleLowerCase('tr')
  const filtered = notes.filter(
    (n) =>
      (!selectedTag || n.tags.includes(selectedTag)) &&
      (!needle || n.content.toLocaleLowerCase('tr').includes(needle))
  )
  const filtering = !!needle || !!selectedTag

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Ara</h1>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex items-center rounded-full bg-terminal-surface px-4">
          <svg className="h-4 w-4 text-terminal-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Notlarda ara..."
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-terminal-muted border-none"
          />
        </div>
      </form>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-terminal-border border-t-terminal-green" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-terminal-muted">
          {filtering ? 'Sonuç bulunamadı.' : 'Henüz not yok.'}
        </div>
      ) : (
        <div className="space-y-2">
          <span className="text-xs text-terminal-muted">
            {filtered.length} {filtering ? 'sonuç' : 'not'}
          </span>
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdateType={(type) => updateNote(note.id, { type })}
              onUpdateContent={(content) => updateNote(note.id, { content })}
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
