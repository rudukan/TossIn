'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Note, NoteType } from '@/lib/types'

interface NotesContextValue {
  allNotes: Note[]
  loading: boolean
  createNote: (content: string) => Promise<{ data: Note | null; error: unknown }>
  updateNote: (id: string, updates: Partial<Pick<Note, 'content' | 'type' | 'tags' | 'is_starred' | 'due_date'>>) => Promise<{ data: Note | null; error: unknown }>
  deleteNote: (id: string) => Promise<{ error: unknown }>
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
  const [loading, setLoading] = useState(true)
  const initialFetchDone = useRef(false)

  const fetchAll = useCallback(async () => {
    if (!user) return
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .order('is_starred', { ascending: false })
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setAllNotes(data as Note[])
    }
    setLoading(false)
    initialFetchDone.current = true
  }, [user])

  // Initial fetch — wait for user
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setAllNotes([])
      setLoading(false)
      return
    }
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
      console.error('[updateNote] Supabase error:', error, 'id:', id, 'updates:', updates)
      // Rollback by refetching
      fetchAll()
    }
    return { data: data as Note | null, error }
  }, [fetchAll])

  const deleteNote = useCallback(async (id: string) => {
    setAllNotes((prev) => prev.filter((n) => n.id !== id))
    const { error } = await getSupabase().from('notes').delete().eq('id', id)
    if (error) {
      fetchAll()
    }
    return { error }
  }, [fetchAll])

  const searchNotes = useCallback(async (query: string) => {
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .textSearch('content', query, { config: 'turkish' })
      .order('updated_at', { ascending: false })

    return { data: data as Note[] | null, error }
  }, [])

  const value = useMemo(
    () => ({ allNotes, loading, createNote, updateNote, deleteNote, searchNotes, refetch: fetchAll }),
    [allNotes, loading, createNote, updateNote, deleteNote, searchNotes, fetchAll]
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
  }
}
