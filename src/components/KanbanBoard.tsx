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
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Note, NoteType } from '@/lib/types'

const columns: { id: NoteType; label: string; dot: string }[] = [
  { id: 'inbox', label: 'Inbox', dot: 'bg-[#2AABEE]' },
  { id: 'in_progress', label: 'Yapılıyor', dot: 'bg-[#E8A33D]' },
  { id: 'waiting', label: 'Beklemede', dot: 'bg-[#B388FF]' },
  { id: 'done', label: 'Bitti', dot: 'bg-[#4FAE4F]' },
]

function SortableCard({
  note,
  onDelete,
  onUpdate,
}: {
  note: Note
  onDelete: () => void
  onUpdate: (content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(note.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled: editing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

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
      style={style}
      className={`rounded-xl border bg-terminal-surface p-3 transition-all ${
        isDragging ? 'opacity-50 border-terminal-green/40' :
        editing ? 'border-terminal-green/50' :
        'border-terminal-border hover:border-terminal-green/30 hover:bg-terminal-surface-hover'
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
          className="text-sm leading-relaxed text-white cursor-text"
          onDoubleClick={(e) => {
            e.stopPropagation()
            setEditing(true)
          }}
        >
          {note.content}
        </p>
      )}

      {note.due_date && !editing && (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
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

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-terminal-muted">
          {new Date(note.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditing(true)
              }}
              className="text-[10px] text-terminal-muted hover:text-terminal-green transition-colors"
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
              className="text-[10px] text-terminal-green font-semibold hover:underline"
            >
              Kaydet
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-[10px] text-terminal-muted hover:text-terminal-red transition-colors"
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
}: {
  column: (typeof columns)[number]
  notes: Note[]
  onDelete: (id: string) => void
  onUpdate: (id: string, content: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[280px] flex-col rounded-2xl p-4 transition-colors ${
        isOver
          ? 'bg-terminal-green/10'
          : 'bg-[#1c2734]'
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${column.dot}`} />
          <h2 className="text-xs font-semibold text-white">
            {column.label}
          </h2>
        </div>
        <span className="rounded-full bg-terminal-surface px-2 py-0.5 text-[10px] font-medium text-terminal-muted">
          {notes.length}
        </span>
      </div>

      <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {notes.map((note) => (
            <SortableCard
              key={note.id}
              note={note}
              onDelete={() => onDelete(note.id)}
              onUpdate={(content) => onUpdate(note.id, content)}
            />
          ))}
          {notes.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-terminal-border py-8">
              <span className="text-xs text-terminal-muted">Boş</span>
            </div>
          )}
        </div>
      </SortableContext>
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

  const handleDragOver = (_event: DragOverEvent) => {}

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveNote(null)
    const { active, over } = event
    if (!over) return

    const noteId = active.id as string
    const note = notes.find((n) => n.id === noteId)
    if (!note) return

    const overId = over.id as string

    const targetColumn = columns.find((c) => c.id === overId)
    if (targetColumn && targetColumn.id !== note.type) {
      onUpdateType(noteId, targetColumn.id)
      return
    }

    const targetNote = notes.find((n) => n.id === overId)
    if (targetNote && targetNote.type !== note.type) {
      onUpdateType(noteId, targetNote.type)
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
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            notes={notesByType(col.id)}
            onDelete={onDelete}
            onUpdate={onUpdateContent}
          />
        ))}
      </div>

      <DragOverlay>
        {activeNote ? <NotePreview note={activeNote} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
