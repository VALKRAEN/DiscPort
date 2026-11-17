import type { Role } from './types'

export const rank: Record<Role, number> = { owner: 4, admin: 3, moderator: 2, member: 1 }

export const roleLabel: Record<Role, string> = {
  owner: 'owner',
  admin: 'admin',
  moderator: 'mod',
  member: '',
}

export const roleStyle: Record<Role, string> = {
  owner: 'text-amber-400',
  admin: 'text-red-400',
  moderator: 'text-sky-400',
  member: '',
}