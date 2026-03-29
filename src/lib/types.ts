export type NoteType = 'inbox' | 'actionable' | 'reference' | 'done'
export type NoteSource = 'web' | 'telegram' | 'voice'

export interface Note {
  id: string
  user_id: string
  content: string
  type: NoteType
  tags: string[]
  is_starred: boolean
  source: NoteSource
  created_at: string
  updated_at: string
}
