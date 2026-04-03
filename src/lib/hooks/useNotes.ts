'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Note, NoteType } from '@/lib/types'

export function useNotes(typeFilter?: NoteType | NoteType[]) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const skipNextEvent = useRef(false)

  const fetchNotes = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    let query = getSupabase()
      .from('notes')
      .select('*')
      .order('is_starred', { ascending: false })
      .order('created_at', { ascending: false })

    if (typeFilter) {
      if (Array.isArray(typeFilter)) {
        query = query.in('type', typeFilter)
      } else {
        query = query.eq('type', typeFilter)
      }
    }

    const { data, error } = await query
    if (!error && data) {
      setNotes(data as Note[])
    }
    setLoading(false)
  }, [typeFilter])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Refetch when OTHER useNotes instances mutate
  useEffect(() => {
    const handler = () => {
      if (skipNextEvent.current) {
        skipNextEvent.current = false
        return
      }
      fetchNotes(false)
    }
    window.addEventListener('notes-changed', handler)
    return () => window.removeEventListener('notes-changed', handler)
  }, [fetchNotes])

  // Supabase Realtime — sync from external changes (Telegram, other devices)
  useEffect(() => {
    const channel = getSupabase()
      .channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        fetchNotes(false)
      })
      .subscribe()

    return () => {
      getSupabase().removeChannel(channel)
    }
  }, [fetchNotes])

  const createNote = async (content: string) => {
    const { data, error } = await getSupabase()
      .from('notes')
      .insert({ content, type: 'inbox', source: 'web' })
      .select()
      .single()

    if (!error && data) {
      setNotes((prev) => [data as Note, ...prev])
      skipNextEvent.current = true
      window.dispatchEvent(new Event('notes-changed'))
    }
    return { data, error }
  }

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'content' | 'type' | 'tags' | 'is_starred' | 'due_date'>>) => {
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
        .filter((n) => {
          if (!typeFilter) return true
          const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter]
          return types.includes(n.type)
        })
    )
    skipNextEvent.current = true
    window.dispatchEvent(new Event('notes-changed'))

    const { data, error } = await getSupabase()
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      fetchNotes(false)
    }
    return { data, error }
  }

  const deleteNote = async (id: string) => {
    // Optimistic delete
    setNotes((prev) => prev.filter((n) => n.id !== id))
    skipNextEvent.current = true
    window.dispatchEvent(new Event('notes-changed'))

    const { error } = await getSupabase().from('notes').delete().eq('id', id)
    if (error) {
      fetchNotes(false)
    }
    return { error }
  }

  const searchNotes = async (query: string) => {
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .textSearch('content', query, { config: 'turkish' })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setNotes(data as Note[])
    }
    return { data, error }
  }

  return { notes, loading, createNote, updateNote, deleteNote, searchNotes, refetch: fetchNotes }
}
