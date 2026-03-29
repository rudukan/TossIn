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

const columns: { id: NoteType; label: string; color: string }[] = [
  { id: 'inbox', label: 'Inbox', color: 'text-blue-400' },
  { id: 'actionable', label: 'Yapilacak', color: 'text-orange-400' },
  { id: 'reference', label: 'Referans', color: 'text-purple-400' },
  { id: 'done', label: 'Bitti', color: 'text-green-400' },
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
      className={`rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg shadow-zinc-900/50' : 'hover:border-zinc-700'
      }`}
      {...attributes}
      {...listeners}
    >
      <p className="text-sm leading-relaxed text-zinc-200">{note.content}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
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
          className="text-[10px] text-zinc-600 hover:text-red-400"
        >
          Sil
        </button>
      </div>
    </div>
  )
}

function NotePreview({ note }: { note: Note }) {
  return (
    <div className="rounded-lg border border-zinc-600 bg-zinc-800 p-3 shadow-xl">
      <p className="text-sm text-zinc-200">{note.content}</p>
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
      className={`flex min-h-[200px] flex-col rounded-xl border p-3 transition-colors ${
        isOver
          ? 'border-zinc-600 bg-zinc-800/50'
          : 'border-zinc-800/50 bg-zinc-950/30'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${column.color}`}>
          {column.label}
        </h2>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
          {notes.length}
        </span>
      </div>

      <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {notes.map((note) => (
            <SortableCard key={note.id} note={note} onDelete={() => onDelete(note.id)} />
          ))}
          {notes.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-800 py-8">
              <span className="text-xs text-zinc-600">Surukle birak</span>
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
