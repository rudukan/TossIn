'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Note, NoteType } from '@/lib/types'

const columns: { id: NoteType; label: string; color: string; symbol: string }[] = [
  { id: 'inbox', label: 'INBOX', color: 'text-blue-400', symbol: '>' },
  { id: 'in_progress', label: 'ACTIVE', color: 'text-terminal-amber', symbol: '*' },
  { id: 'waiting', label: 'WAIT', color: 'text-terminal-purple', symbol: '~' },
  { id: 'done', label: 'DONE', color: 'text-terminal-green', symbol: '+' },
]

function SortableCard({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-terminal-border bg-terminal-surface p-2.5 transition-all ${
        isDragging ? 'opacity-50 border-terminal-green/30' : 'hover:border-terminal-muted/60 hover:bg-terminal-surface-hover'
      }`}
      {...attributes}
      {...listeners}
    >
      <p className="text-xs leading-relaxed text-foreground">{note.content}</p>
      {note.due_date && (
        <p className={`mt-1 text-[10px] font-medium ${
          new Date(note.due_date) < new Date() ? 'text-terminal-red' :
          new Date(note.due_date).toDateString() === new Date().toDateString() ? 'text-terminal-amber' :
          'text-terminal-muted'
        }`}>
          {new Date(note.due_date) < new Date() ? '[!]' :
           new Date(note.due_date).toDateString() === new Date().toDateString() ? '[*]' : '[@]'}{' '}
          {new Date(note.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}{' '}
          {new Date(note.due_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[9px] text-terminal-muted">
          {new Date(note.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-[9px] text-terminal-muted hover:text-terminal-red transition-colors"
        >
          [rm]
        </button>
      </div>
    </div>
  )
}

function NotePreview({ note }: { note: Note }) {
  return (
    <div className="border border-terminal-green/30 bg-terminal-surface p-2.5 shadow-lg shadow-terminal-green/5">
      <p className="text-xs text-foreground">{note.content}</p>
    </div>
  )
}

function Column({
  column,
  notes,
  onDelete,
}: {
  column: (typeof columns)[number]
  notes: Note[]
  onDelete: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[200px] flex-col border p-2.5 transition-colors ${
        isOver
          ? 'border-terminal-green/30 bg-terminal-green/5'
          : 'border-terminal-border bg-black'
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-terminal-border pb-2">
        <h2 className={`text-[11px] font-bold tracking-wider ${column.color}`}>
          <span className="text-terminal-muted">{column.symbol}</span> {column.label}
        </h2>
        <span className="text-[10px] text-terminal-muted">
          [{notes.length}]
        </span>
      </div>

      <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-1.5">
          {notes.map((note) => (
            <SortableCard key={note.id} note={note} onDelete={() => onDelete(note.id)} />
          ))}
          {notes.length === 0 && (
            <div className="flex flex-1 items-center justify-center border border-dashed border-terminal-border/50 py-8">
              <span className="text-[10px] text-terminal-muted">-- empty --</span>
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
  onDelete,
}: {
  notes: Note[]
  onUpdateType: (id: string, type: NoteType) => void
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

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by Column's isOver
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveNote(null)
    const { active, over } = event
    if (!over) return

    const noteId = active.id as string
    const note = notes.find((n) => n.id === noteId)
    if (!note) return

    // Dropped on a column directly
    const targetColumn = columns.find((c) => c.id === over.id)
    if (targetColumn && targetColumn.id !== note.type) {
      onUpdateType(noteId, targetColumn.id)
      return
    }

    // Dropped on another note — find which column that note belongs to
    const targetNote = notes.find((n) => n.id === over.id)
    if (targetNote && targetNote.type !== note.type) {
      onUpdateType(noteId, targetNote.type)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            notes={notesByType(col.id)}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeNote ? <NotePreview note={activeNote} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
