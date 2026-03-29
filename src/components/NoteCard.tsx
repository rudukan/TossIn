'use client'

import { useState } from 'react'
import type { Note, NoteType } from '@/lib/types'
import TagPill from './TagPill'

const typeLabels: Record<NoteType, string> = {
  inbox: 'Inbox',
  actionable: 'Yapilacak',
  reference: 'Referans',
  done: 'Bitti',
}

const typeColors: Record<NoteType, string> = {
  inbox: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  actionable: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  reference: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

export default function NoteCard({
  note,
  onUpdateType,
  onToggleStar,
  onAddTag,
  onRemoveTag,
  onDelete,
  showTypeChanger = false,
}: {
  note: Note
  onUpdateType?: (type: NoteType) => void
  onToggleStar?: () => void
  onAddTag?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
  onDelete?: () => void
  showTypeChanger?: boolean
}) {
  const [tagInput, setTagInput] = useState('')
  const [showActions, setShowActions] = useState(false)

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      onAddTag?.(tagInput.trim().toLowerCase())
      setTagInput('')
    }
  }

  return (
    <div className="group rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {note.content}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggleStar}
            className={`rounded p-1 transition-colors ${
              note.is_starred
                ? 'text-amber-500'
                : 'text-zinc-300 hover:text-amber-400 dark:text-zinc-600'
            }`}
            title={note.is_starred ? 'Yildizi kaldir' : 'Yildizla'}
          >
            <svg className="h-4 w-4" fill={note.is_starred ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            className="rounded p-1 text-zinc-300 transition-colors hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[note.type]}`}>
          {typeLabels[note.type]}
        </span>
        {note.tags.map((tag) => (
          <TagPill
            key={tag}
            tag={tag}
            removable={!!onRemoveTag}
            onRemove={() => onRemoveTag?.(tag)}
          />
        ))}
      </div>

      {/* Actions panel */}
      {showActions && (
        <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {/* Type changer */}
          {showTypeChanger && (
            <div className="flex flex-wrap gap-1.5">
              {(['inbox', 'actionable', 'reference', 'done'] as NoteType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdateType?.(t)}
                  disabled={note.type === t}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    note.type === t
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          )}

          {/* Tag input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Etiket ekle + Enter"
              className="flex-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500"
            />
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
              >
                Sil
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="mt-2 text-[10px] text-zinc-400">
        {new Date(note.created_at).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}
