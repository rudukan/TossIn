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
      <h1 className="text-sm font-bold text-terminal-green glow-green tracking-wider">
        <span className="text-terminal-muted">$</span> SEARCH
      </h1>

      <form onSubmit={handleSearch}>
        <div className="flex items-center border border-terminal-border bg-terminal-surface">
          <span className="px-3 text-terminal-muted text-xs select-none">grep</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="notlarda ara..."
            className="flex-1 bg-transparent px-2 py-2.5 text-xs text-foreground placeholder:text-terminal-muted/50 border-none"
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
          <span className="text-terminal-green cursor-blink text-sm">Searching...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-xs text-terminal-muted">
          {searched ? '-- 0 sonuc --' : '-- aramak icin bir sey yaz --'}
        </div>
      ) : (
        <div className="space-y-2">
          <span className="text-[11px] text-terminal-muted">[{filtered.length} sonuc]</span>
          {filtered.map((note) => (
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
