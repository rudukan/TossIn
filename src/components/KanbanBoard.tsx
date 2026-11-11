'use client'

import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { Note, NoteType } from '@/lib/types'

const columns: { id: NoteType; label: string; dot: string }[] = [
  { id: 'inbox', label: 'Inbox', dot: 'bg-[#2AABEE]' },
  { id: 'in_progress', label: 'Yapılıyor', dot: 'bg-[#E8A33D]' },
  { id: 'waiting', label: 'Beklemede', dot: 'bg-[#B388FF]' },
  { id: 'done', label: 'Bitti', dot: 'bg-[#4FAE4F]' },
]

// Cards move between columns only. Order inside a column is not stored,
// so the card is draggable but the list is not sortable.
function BoardCard({
  note,
  onDelete,
  onUpdate,
  onMove,
}: {
  note: Note
  onDelete: () => void
  onUpdate: (content: string) => void
  onMove: (type: NoteType) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(note.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
    disabled: editing,
  })

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  const startEdit = () => {
    setValue(note.content)
    setEditing(true)
  }

  const save = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== note.content) {
      onUpdate(trimmed)
    } else {
      setValue(note.content)
    }
    setEditing(false)
  }

  const cancel = () => {
    setValue(note.content)
    setEditing(false)
  }

  const isOverdue = note.due_date && new Date(note.due_date) < new Date()
  const isToday = note.due_date && new Date(note.due_date).toDateString() === new Date().toDateString()

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border bg-terminal-surface p-3 transition-colors ${
        isDragging ? 'opacity-40 border-terminal-green/40' :
        editing ? 'border-terminal-green/50' :
        'cursor-grab border-terminal-border hover:border-terminal-green/30'
      }`}
      {...(editing ? {} : attributes)}
      {...(editing ? {} : listeners)}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              save()
            } else if (e.key === 'Escape') {
              cancel()
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-white border-none p-0"
          rows={Math.max(2, value.split('\n').length)}
        />
      ) : (
        <p
          className="break-words text-sm leading-relaxed text-white"
          onDoubleClick={(e) => {
            e.stopPropagation()
            startEdit()
          }}
        >
          {note.content}
        </p>
      )}

      {note.due_date && !editing && (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
          isOverdue ? 'bg-terminal-red/15 text-terminal-red' :
          isToday ? 'bg-terminal-amber/15 text-terminal-amber' :
          'bg-terminal-surface-hover text-terminal-muted'
        }`}>
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {new Date(note.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          {' '}
          {new Date(note.due_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Phone: one tap moves the card. Desktop uses drag and drop. */}
      {!editing && (
        <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
          {columns
            .filter((c) => c.id !== note.type)
            .map((c) => (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(c.id)
                }}
                className="flex items-center gap-1.5 rounded-full bg-[#17212b] px-3 py-1.5 text-xs font-medium text-white active:bg-terminal-surface-hover"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-terminal-muted">
          {new Date(note.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
        </span>
        <div className="-mr-2 flex items-center">
          {!editing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                startEdit()
              }}
              className="rounded-full px-2 py-1.5 text-xs text-terminal-muted transition-colors hover:bg-terminal-surface-hover hover:text-white"
            >
              Düzenle
            </button>
          )}
          {editing ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                save()
              }}
              className="rounded-full px-2 py-1.5 text-xs font-semibold text-terminal-green hover:bg-terminal-surface-hover"
            >
              Kaydet
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="rounded-full px-2 py-1.5 text-xs text-terminal-muted transition-colors hover:bg-terminal-red/10 hover:text-terminal-red"
            >
              Sil
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function NotePreview({ note }: { note: Note }) {
  return (
    <div className="rounded-xl border border-terminal-green/40 bg-terminal-surface p-3 shadow-2xl shadow-terminal-green/20">
      <p className="text-sm text-white">{note.content}</p>
    </div>
  )
}

function Column({
  column,
  notes,
  onDelete,
  onUpdate,
  onMove,
}: {
  column: (typeof columns)[number]
  notes: Note[]
  onDelete: (id: string) => void
  onUpdate: (id: string, content: string) => void
  onMove: (id: string, type: NoteType) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl p-3 transition-colors lg:min-h-[280px] ${
        isOver
          ? 'bg-terminal-green/10'
          : 'bg-[#1c2734]'
      }`}
    >
      <div className={`flex items-center justify-between px-1 lg:mb-3 ${notes.length > 0 ? 'mb-3' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${column.dot}`} />
          <h2 className="text-xs font-semibold text-white">
            {column.label}
          </h2>
        </div>
        <span className="rounded-full bg-terminal-surface px-2 py-0.5 text-[11px] font-medium text-terminal-muted">
          {notes.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
          {notes.map((note) => (
            <BoardCard
              key={note.id}
              note={note}
              onDelete={() => onDelete(note.id)}
              onUpdate={(content) => onUpdate(note.id, content)}
              onMove={(type) => onMove(note.id, type)}
            />
          ))}
          {notes.length === 0 && (
            <div className="hidden flex-1 items-center justify-center rounded-xl border border-dashed border-terminal-border py-8 lg:flex">
              <span className="text-xs text-terminal-muted">Boş</span>
            </div>
          )}
      </div>
    </div>
  )
}

export default function KanbanBoard({
  notes,
  onUpdateType,
  onUpdateContent,
  onDelete,
}: {
  notes: Note[]
  onUpdateType: (id: string, type: NoteType) => void
  onUpdateContent: (id: string, content: string) => void
  onDelete: (id: string) => void
}) {
  const [activeNote, setActiveNote] = useState<Note | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const notesByType = (type: NoteType) =>
    notes.filter((n) => n.type === type)

  const handleDragStart = (event: DragStartEvent) => {
    const note = notes.find((n) => n.id === event.active.id)
    if (note) setActiveNote(note)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveNote(null)
    const { active, over } = event
    if (!over) return

    const noteId = active.id as string
    const note = notes.find((n) => n.id === noteId)
    if (!note) return

    // Columns are the only drop targets
    const targetColumn = columns.find((c) => c.id === over.id)
    if (targetColumn && targetColumn.id !== note.type) {
      onUpdateType(noteId, targetColumn.id)
    }
  }

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Phone: statuses stacked, empty ones collapse to one line. Desktop: four side by side. */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            notes={notesByType(col.id)}
            onDelete={onDelete}
            onUpdate={onUpdateContent}
            onMove={onUpdateType}
          />
        ))}
      </div>

      <DragOverlay>
        {activeNote ? <NotePreview note={activeNote} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
