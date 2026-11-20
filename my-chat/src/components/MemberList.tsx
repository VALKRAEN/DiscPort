import type { Member } from '../types'
import { roleLabel, roleStyle } from '../roles'
import Avatar from './Avatar'

type Props = {
  members: Member[]
  onlineIds: Set<string>
  onSelect: (id: string) => void
}

function Group({
  title,
  list,
  online,
  onSelect,
}: {
  title: string
  list: Member[]
  online: boolean
  onSelect: (id: string) => void
}) {
  if (list.length === 0) return null
  return (
    <div className="mb-2">
      <h3 className="px-3 pb-2 pt-5 text-xs font-bold uppercase tracking-wide text-gray-400">
        {title} — {list.length}
      </h3>
      {list.map(m => (
        <button
          key={m.id}
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
            <div className="truncate text-[15px] font-medium text-gray-100">
              {m.display_name}
              {roleLabel[m.role] && (
                <span className={`ml-1.5 text-xs font-semibold ${roleStyle[m.role]}`}>{roleLabel[m.role]}</span>
              )}
            </div>
            <div className="truncate text-xs text-gray-400">@{m.username}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

export default function MemberList({ members, onlineIds, onSelect }: Props) {
  return (
    <aside className="h-full w-full overflow-y-auto bg-[#2b2d31] px-2 pb-4">
      <Group title="Online" list={members.filter(m => onlineIds.has(m.id))} online onSelect={onSelect} />
      <Group
        title="Offline"
        list={members.filter(m => !onlineIds.has(m.id))}
        online={false}
        onSelect={onSelect}
      />
    </aside>
  )
}