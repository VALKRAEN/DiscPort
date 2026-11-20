export type Role = 'owner' | 'admin' | 'moderator' | 'member'

export type Message = {
  id: number
  user_id: string
  content: string
  created_at: string
}
export type Channel = { id: string; name: string; kind: 'text' | 'voice'; created_at?: string }
export type Server = { id: string; name: string; color: string; invite_code: string; channels: Channel[] }
export type Profile = {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_path: string | null
}
export type Member = {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_path: string | null
  role: Role
}
export type Ban = { user_id: string; username: string; display_name: string; created_at: string }
export type DmSummary = {
  conversation_id: string
  other_id: string
  other_username: string
  other_display_name: string
  other_bio: string
  other_avatar_path: string | null
  last_content: string | null
  last_at: string
  last_user_id: string | null
  unread: boolean
}
export type DmMessage = { id: number; conversation_id: string; user_id: string; content: string; created_at: string }