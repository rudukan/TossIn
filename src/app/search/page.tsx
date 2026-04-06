'use client'

import { useMemo, useState } from 'react'
import { useNotes } from '@/lib/hooks/useNotes'
import NoteCard from '@/components/NoteCard'
import TagPill from '@/components/TagPill'

export default function SearchPage() {
  const { notes, loading, searchNotes, updateNote, deleteNote, refetch } = useNotes()
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    notes.forEach((n) => n.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [notes])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      await searchNotes(query.trim())
      setSearched(true)
    } else {
      await refetch()
      setSearched(false)
    }
  }

  const filtered = selectedTag
    ? notes.filter((n) => n.tags.includes(selectedTag))
    : notes

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Ara</h1>

      <form onSubmit={handleSearch}>
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
          {searched ? 'Sonuç bulunamadı.' : 'Aramak için bir şey yaz.'}
        </div>
      ) : (
        <div className="space-y-2">
          <span className="text-xs text-terminal-muted">{filtered.length} sonuç</span>
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              showTypeChanger
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
