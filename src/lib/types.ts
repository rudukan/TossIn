export type NoteType = 'inbox' | 'in_progress' | 'waiting' | 'done'
export type NoteSource = 'web' | 'telegram' | 'voice'

export interface Note {
  id: string
  user_id: string
  content: string
  type: NoteType
  tags: string[]
  is_starred: boolean
  source: NoteSource
  due_date: string | null
  reminded: boolean
  reminded_at: string | null
  created_at: string
  updated_at: string
}
