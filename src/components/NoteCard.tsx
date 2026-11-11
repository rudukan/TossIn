'use client'

import { useState, useEffect, useRef } from 'react'
import { NOTE_TYPES, typeLabels, type Note, type NoteType } from '@/lib/types'
import TagPill from './TagPill'

const typeDots: Record<NoteType, string> = {
  inbox: 'bg-[#2AABEE]',
  in_progress: 'bg-[#E8A33D]',
  waiting: 'bg-[#B388FF]',
  done: 'bg-[#4FAE4F]',
}

const typeColors: Record<NoteType, string> = {
  inbox: 'bg-[#2AABEE]/15 text-[#2AABEE]',
  in_progress: 'bg-[#E8A33D]/15 text-[#E8A33D]',
  waiting: 'bg-[#B388FF]/15 text-[#B388FF]',
  done: 'bg-[#4FAE4F]/15 text-[#4FAE4F]',
}

export default function NoteCard({
  note,
  onUpdateType,
  onUpdateContent,
  onToggleStar,
  onAddTag,
  onRemoveTag,
  onDelete,
  hideType = false,
}: {
  note: Note
  onUpdateType?: (type: NoteType) => void
  onUpdateContent?: (content: string) => void
  onToggleStar?: () => void
  onAddTag?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
  onDelete?: () => void
  /** Hide the status badge when the page already implies it (Inbox) */
  hideType?: boolean
}) {
  const [tagInput, setTagInput] = useState('')
  const [showActions, setShowActions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(note.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  const startEdit = () => {
    setEditValue(note.content)
    setEditing(true)
  }

  const saveEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== note.content) {
      onUpdateContent?.(trimmed)
    } else {
      setEditValue(note.content)
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditValue(note.content)
    setEditing(false)
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      onAddTag?.(tagInput.trim().toLowerCase())
      setTagInput('')
    }
  }

  const isOverdue = note.due_date && new Date(note.due_date) < new Date()
  const isToday = note.due_date && new Date(note.due_date).toDateString() === new Date().toDateString()

  return (
    <div className="rounded-2xl border border-terminal-border bg-terminal-surface p-4 transition-colors hover:border-terminal-green/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  saveEdit()
                } else if (e.key === 'Escape') {
                  cancelEdit()
                }
              }}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-white border-none p-0"
              rows={Math.max(2, editValue.split('\n').length)}
            />
          ) : (
            <p
              className="text-sm leading-relaxed text-white cursor-text"
              onDoubleClick={() => onUpdateContent && startEdit()}
            >
              {note.content}
            </p>
          )}
          {note.due_date && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isOverdue ? 'bg-terminal-red/15 text-terminal-red' :
              isToday ? 'bg-terminal-amber/15 text-terminal-amber' :
              'bg-terminal-surface-hover text-terminal-muted'
            }`}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {new Date(note.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              {' · '}
              {new Date(note.due_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggleStar}
            className={`rounded-full p-2 transition-colors ${
              note.is_starred
                ? 'text-terminal-amber'
                : 'text-terminal-muted hover:text-terminal-amber hover:bg-terminal-surface-hover'
            }`}
            title={note.is_starred ? 'Yıldızı kaldır' : 'Yıldızla'}
            aria-label={note.is_starred ? 'Yıldızı kaldır' : 'Yıldızla'}
            aria-pressed={note.is_starred}
          >
            <svg className="h-4 w-4" fill={note.is_starred ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            title="Düzenle, etiketle, sil"
            aria-label="Düzenle, etiketle, sil"
            aria-expanded={showActions}
            className="rounded-full p-2 text-terminal-muted transition-colors hover:text-white hover:bg-terminal-surface-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status badge + tags */}
      {(!hideType || note.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {!hideType && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeColors[note.type]}`}>
              {typeLabels[note.type]}
            </span>
          )}
          {note.tags.map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              removable={!!onRemoveTag}
              onRemove={() => onRemoveTag?.(tag)}
            />
          ))}
        </div>
      )}

      {/* One-click move + date */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {onUpdateType &&
          NOTE_TYPES.filter((t) => t !== note.type).map((t) => (
            <button
              key={t}
              onClick={() => onUpdateType(t)}
              title={`${typeLabels[t]} olarak işaretle`}
              className="inline-flex items-center gap-1.5 rounded-full bg-terminal-surface-hover px-3 py-2 text-xs font-medium text-white/90 transition-colors hover:bg-[#35475a] hover:text-white"
            >
              <span className={`h-2 w-2 rounded-full ${typeDots[t]}`} />
              {typeLabels[t]}
            </button>
          ))}
        <span className="ml-auto text-[11px] text-terminal-muted">
          {new Date(note.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Actions panel */}
      {showActions && (
        <div className="mt-3 space-y-3 border-t border-terminal-border pt-3">
          <div className="flex items-center gap-2">
            {onUpdateContent && (
              <button
                onClick={startEdit}
                className="rounded-full bg-terminal-surface-hover px-3 py-2 text-xs font-medium text-white/90 transition-colors hover:bg-[#35475a] hover:text-white"
              >
                Düzenle
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded-full px-3 py-2 text-xs font-medium text-terminal-red transition-colors hover:bg-terminal-red/10"
              >
                Sil
              </button>
            )}
          </div>

          {onAddTag && (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-terminal-muted">Etiket ekle</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Yaz ve Enter'a bas..."
                className="w-full rounded-full border border-terminal-border bg-[#17212b] px-4 py-2 text-xs text-white placeholder:text-terminal-muted hover:border-terminal-muted/60"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
