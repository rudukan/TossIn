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
      <h1 className="text-lg font-semibold">Ara</h1>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Notlarinda ara..."
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
        />
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
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-zinc-400">
          {searched ? 'Sonuc bulunamadi.' : 'Aramak icin bir sey yaz.'}
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-sm text-zinc-400">{filtered.length} sonuc</span>
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
