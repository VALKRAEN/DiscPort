import type { Member, Role } from '../types'
import { roleStyle } from '../roles'
import Avatar from './Avatar'

type Props = {
  members: Member[]
  onlineIds: Set<string>
  onSelect: (id: string) => void
}

const STAFF: { role: Role; title: string }[] = [
  { role: 'owner', title: 'Owner' },
  { role: 'admin', title: 'Admins' },
  { role: 'moderator', title: 'Moderators' },
]

function Row({ m, online, onSelect }: { m: Member; online: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(m.id)}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/5 ${
        online ? '' : 'opacity-50 hover:opacity-80'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar id={m.id} name={m.display_name} path={m.avatar_path} size={36} />
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#2b2d31] bg-green-500" />
        )}
      </div>
      <div className="min-w-0 leading-tight">
        <div className={`truncate text-[15px] font-medium ${roleStyle[m.role] || 'text-gray-100'}`}>
          {m.display_name}
          {m.role === 'owner' && (
            <span title="Owner" className="ml-1.5 text-sm">
              👑
            </span>
          )}
        </div>
        <div className="truncate text-xs text-gray-400">@{m.username}</div>
      </div>
    </button>
  )
}

export default function MemberList({ members, onlineIds, onSelect }: Props) {
  const isOnline = (m: Member) => onlineIds.has(m.id)
  const groups: { title: string; list: Member[]; online: boolean }[] = [
    ...STAFF.map(s => ({
      title: s.title,
      list: members.filter(m => m.role === s.role && isOnline(m)),
      online: true,
    })),
    { title: 'Online', list: members.filter(m => m.role === 'member' && isOnline(m)), online: true },
    { title: 'Offline', list: members.filter(m => !isOnline(m)), online: false },
  ]

  return (
    <aside className="h-full w-full overflow-y-auto bg-[#2b2d31] px-2 pb-4">
      {groups.map(
        g =>
          g.list.length > 0 && (
            <div key={g.title} className="mb-2">
              <h3 className="px-3 pb-2 pt-5 text-xs font-bold uppercase tracking-wide text-gray-400">
                {g.title} — {g.list.length}
              </h3>
              {g.list.map(m => (
                <Row key={m.id} m={m} online={g.online} onSelect={onSelect} />
              ))}
            </div>
          )
      )}
    </aside>
  )
}