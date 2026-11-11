'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Note, NoteType } from '@/lib/types'

export interface Toast {
  id: number
  message: string
  kind: 'info' | 'error'
  onUndo?: () => void
}

const UNDO_MS = 5000

interface NotesContextValue {
  allNotes: Note[]
  loading: boolean
  toast: Toast | null
  dismissToast: () => void
  showError: (message: string) => void
  showToast: (message: string, onUndo?: () => void) => void
  createNote: (content: string) => Promise<{ data: Note | null; error: unknown }>
  updateNote: (id: string, updates: Partial<Pick<Note, 'content' | 'type' | 'tags' | 'is_starred' | 'due_date'>>) => Promise<{ data: Note | null; error: unknown }>
  deleteNote: (id: string) => void
  searchNotes: (query: string) => Promise<{ data: Note[] | null; error: unknown }>
  refetch: () => Promise<void>
}

const NotesContext = createContext<NotesContextValue | null>(null)

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [allNotes, setAllNotes] = useState<Note[]>([])
  // Which user's notes are in allNotes — loading and visibility derive from this
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  // Deleted notes waiting out the undo window, keyed by note id
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismissToast = useCallback(() => setToast(null), [])
  const showError = useCallback((message: string) => {
    setToast({ id: Date.now(), message, kind: 'error' })
  }, [])

  const fetchAll = useCallback(async () => {
    if (!user) return
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .order('is_starred', { ascending: false })
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setAllNotes((data as Note[]).filter((n) => !pendingDeletes.current.has(n.id)))
    }
    setLoadedFor(user.id)
  }, [user])

  // Initial fetch — wait for user
  useEffect(() => {
    if (authLoading || !user) return
    fetchAll()
  }, [fetchAll, user, authLoading])

  // Realtime subscription — filtered by user_id
  useEffect(() => {
    if (!user) return
    const channel = getSupabase()
      .channel(`notes-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` }, (payload) => {
        // Optimistic merge based on event type — avoid full refetch
        if (payload.eventType === 'INSERT') {
          const newNote = payload.new as Note
          setAllNotes((prev) => {
            if (prev.some((n) => n.id === newNote.id)) return prev
            return sortNotes([...prev, newNote])
          })
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Note
          setAllNotes((prev) => sortNotes(prev.map((n) => (n.id === updated.id ? updated : n))))
        } else if (payload.eventType === 'DELETE') {
          const oldNote = payload.old as Note
          setAllNotes((prev) => prev.filter((n) => n.id !== oldNote.id))
        }
      })
      .subscribe()

    return () => {
      getSupabase().removeChannel(channel)
    }
  }, [user])

  const showToast = useCallback((message: string, onUndo?: () => void) => {
    setToast({
      id: Date.now(),
      message,
      kind: 'info',
      onUndo: onUndo && (() => {
        onUndo()
        setToast(null)
      }),
    })
  }, [])

  const createNote = useCallback(async (content: string) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    const { data, error } = await getSupabase()
      .from('notes')
      .insert({ content, type: 'inbox', source: 'web', user_id: user.id })
      .select()
      .single()

    if (!error && data) {
      setAllNotes((prev) => sortNotes([data as Note, ...prev]))
    }
    return { data: data as Note | null, error }
  }, [user])

  const updateNote = useCallback(async (
    id: string,
    updates: Partial<Pick<Note, 'content' | 'type' | 'tags' | 'is_starred' | 'due_date'>>
  ) => {
    // Optimistic update
    setAllNotes((prev) =>
      sortNotes(prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)))
    )

    const { data, error } = await getSupabase()
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Rollback by refetching
      fetchAll()
      showError('Değişiklik kaydedilemedi.')
    }
    return { data: data as Note | null, error }
  }, [fetchAll, showError])

  // Delete is held back for UNDO_MS so it can be undone; the row is only
  // removed from the database once the window passes.
  const deleteNote = useCallback((id: string) => {
    const note = allNotes.find((n) => n.id === id)
    if (!note) return

    setAllNotes((prev) => prev.filter((n) => n.id !== id))

    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(id)
      const { error } = await getSupabase().from('notes').delete().eq('id', id)
      if (error) {
        fetchAll()
        showError('Not silinemedi.')
      }
    }, UNDO_MS)
    pendingDeletes.current.set(id, timer)

    setToast({
      id: Date.now(),
      message: 'Not silindi',
      kind: 'info',
      onUndo: () => {
        clearTimeout(timer)
        pendingDeletes.current.delete(id)
        setAllNotes((prev) => (prev.some((n) => n.id === id) ? prev : sortNotes([...prev, note])))
        setToast(null)
      },
    })
  }, [allNotes, fetchAll, showError])

  const searchNotes = useCallback(async (query: string) => {
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .textSearch('content', query, { config: 'turkish' })
      .order('updated_at', { ascending: false })

    return { data: data as Note[] | null, error }
  }, [])

  const ready = !!user && loadedFor === user.id
  const loading = authLoading || (!!user && !ready)

  const value = useMemo(
    () => ({
      allNotes: ready ? allNotes : [],
      loading,
      toast,
      dismissToast,
      showError,
      showToast,
      createNote,
      updateNote,
      deleteNote,
      searchNotes,
      refetch: fetchAll,
    }),
    [ready, allNotes, loading, toast, dismissToast, showError, showToast, createNote, updateNote, deleteNote, searchNotes, fetchAll]
  )

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

export function useNotes(typeFilter?: NoteType | NoteType[]) {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes must be used within NotesProvider')

  const notes = useMemo(() => {
    if (!typeFilter) return ctx.allNotes
    const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter]
    return ctx.allNotes.filter((n) => types.includes(n.type))
  }, [ctx.allNotes, typeFilter])

  return {
    notes,
    loading: ctx.loading,
    createNote: ctx.createNote,
    updateNote: ctx.updateNote,
    deleteNote: ctx.deleteNote,
    searchNotes: ctx.searchNotes,
    refetch: ctx.refetch,
    showError: ctx.showError,
    showToast: ctx.showToast,
  }
}

export function useToast() {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useToast must be used within NotesProvider')
  return { toast: ctx.toast, dismissToast: ctx.dismissToast }
}
