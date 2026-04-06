'use client'

import { useState, useEffect, useRef } from 'react'
import type { Note, NoteType } from '@/lib/types'
import TagPill from './TagPill'

const typeLabels: Record<NoteType, string> = {
  inbox: 'Inbox',
  in_progress: 'Yapılıyor',
  waiting: 'Beklemede',
  done: 'Bitti',
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
  showTypeChanger = false,
}: {
  note: Note
  onUpdateType?: (type: NoteType) => void
  onUpdateContent?: (content: string) => void
  onToggleStar?: () => void
  onAddTag?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
  onDelete?: () => void
  showTypeChanger?: boolean
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

  useEffect(() => {
    setEditValue(note.content)
  }, [note.content])

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
    <div className="group rounded-2xl border border-terminal-border bg-terminal-surface p-4 transition-all hover:border-terminal-green/30 hover:bg-terminal-surface-hover">
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
              onDoubleClick={() => onUpdateContent && setEditing(true)}
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
            className={`rounded-full p-1.5 transition-colors ${
              note.is_starred
                ? 'text-terminal-amber'
                : 'text-terminal-muted hover:text-terminal-amber hover:bg-terminal-surface-hover'
            }`}
            title={note.is_starred ? 'Yıldızı kaldır' : 'Yıldızla'}
          >
            <svg className="h-4 w-4" fill={note.is_starred ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            className="rounded-full p-1.5 text-terminal-muted transition-colors hover:text-white hover:bg-terminal-surface-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status + Tags */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${typeColors[note.type]}`}>
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
        <span className="ml-auto text-[10px] text-terminal-muted">
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
          {onUpdateContent && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-terminal-green hover:underline"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              İçeriği düzenle
            </button>
          )}

          {showTypeChanger && (
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-terminal-muted">Durum</label>
              <div className="flex flex-wrap gap-1.5">
                {(['inbox', 'in_progress', 'waiting', 'done'] as NoteType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => onUpdateType?.(t)}
                    disabled={note.type === t}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      note.type === t
                        ? 'bg-terminal-green text-white'
                        : 'bg-terminal-surface-hover text-terminal-muted hover:text-white'
                    }`}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-terminal-muted">Etiket ekle</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Yaz ve Enter'a bas..."
                className="flex-1 rounded-full bg-terminal-surface-hover px-3 py-1.5 text-xs text-white placeholder:text-terminal-muted/60 border-none"
              />
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="rounded-full px-3 py-1.5 text-xs text-terminal-red hover:bg-terminal-red/10 transition-colors"
                >
                  Sil
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
