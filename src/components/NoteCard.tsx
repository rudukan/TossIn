'use client'

import { useState } from 'react'
import type { Note, NoteType } from '@/lib/types'
import TagPill from './TagPill'

const typeLabels: Record<NoteType, string> = {
  inbox: 'INBOX',
  in_progress: 'ACTIVE',
  waiting: 'WAIT',
  done: 'DONE',
}

const typeColors: Record<NoteType, string> = {
  inbox: 'border-blue-500/40 text-blue-400',
  in_progress: 'border-terminal-amber/40 text-terminal-amber',
  waiting: 'border-terminal-purple/40 text-terminal-purple',
  done: 'border-terminal-green/40 text-terminal-green',
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
    <div className="group border border-terminal-border bg-terminal-surface p-4 transition-colors hover:border-terminal-muted/60 hover:bg-terminal-surface-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-foreground">
            {note.content}
          </p>
          {note.due_date && (
            <p className={`mt-1.5 text-[11px] font-medium ${
              new Date(note.due_date) < new Date() ? 'text-terminal-red' :
              new Date(note.due_date).toDateString() === new Date().toDateString() ? 'text-terminal-amber glow-amber' :
              'text-terminal-muted'
            }`}>
              {new Date(note.due_date) < new Date() ? '[OVERDUE]' :
               new Date(note.due_date).toDateString() === new Date().toDateString() ? '[TODAY]' : '[DUE]'}{' '}
              {new Date(note.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}{' '}
              {new Date(note.due_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggleStar}
            className={`p-1 text-xs transition-colors ${
              note.is_starred
                ? 'text-terminal-amber glow-amber'
                : 'text-terminal-muted hover:text-terminal-amber'
            }`}
            title={note.is_starred ? 'Yildizi kaldir' : 'Yildizla'}
          >
            {note.is_starred ? '*' : '.'}
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-xs text-terminal-muted transition-colors hover:text-foreground"
          >
            [...]
          </button>
        </div>
      </div>

      {/* Status + Tags */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`border px-1.5 py-0.5 text-[10px] font-bold ${typeColors[note.type]}`}>
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
        <span className="text-[10px] text-terminal-muted ml-auto">
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
          {/* Type changer */}
          {showTypeChanger && (
            <div className="flex flex-wrap gap-1.5">
              {(['inbox', 'in_progress', 'waiting', 'done'] as NoteType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdateType?.(t)}
                  disabled={note.type === t}
                  className={`px-2 py-1 text-[11px] font-medium transition-colors border ${
                    note.type === t
                      ? 'border-terminal-green/50 text-terminal-green bg-terminal-green/10'
                      : 'border-terminal-border text-terminal-muted hover:border-terminal-muted hover:text-foreground'
                  }`}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          )}

          {/* Tag input */}
          <div className="flex items-center gap-2">
            <span className="text-terminal-muted text-[11px]">tag:</span>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="etiket + Enter"
              className="flex-1 bg-transparent border-b border-terminal-border px-1 py-1 text-xs text-terminal-cyan placeholder:text-terminal-muted/50 focus:border-terminal-cyan"
            />
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-2 py-1 text-[11px] text-terminal-red border border-terminal-red/20 hover:bg-terminal-red/10 transition-colors"
              >
                rm
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
