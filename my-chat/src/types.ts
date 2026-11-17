export type Role = 'owner' | 'admin' | 'moderator' | 'member'

export type Message = {
  id: number
  user_id: string
  content: string
  created_at: string
}
export type Channel = { id: string; name: string; created_at?: string }
export type Server = { id: string; name: string; color: string; invite_code: string; channels: Channel[] }
export type Profile = { id: string; username: string; display_name: string; bio: string }
export type Member = { id: string; username: string; display_name: string; bio: string; role: Role }
export type Ban = { user_id: string; username: string; display_name: string; created_at: string }