import type { Member } from '../types'
import { colorFor } from '../colors'
import { roleLabel, roleStyle } from '../roles'

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
    <div className="mb-4">
      <h3 className="px-2 mb-1 text-xs font-semibold uppercase text-gray-400">
        {title} - {list.length}
      </h3>
      {list.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`flex w-full items-center gap-3 rounded px-2 py-1 text-left hover:bg-white/10 ${
            online ? '' : 'opacity-40 hover:opacity-70'
          }`}
        >
          <div className="relative shrink-0">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${colorFor(m.id)}`}
            >
              {m.display_name[0]?.toUpperCase()}
            </div>
            {online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#2b2d31] bg-green-500" />
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm">
              {m.display_name}
              {roleLabel[m.role] && (
                <span className={`ml-1 text-xs ${roleStyle[m.role]}`}>({roleLabel[m.role]})</span>
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
    <aside className="w-60 bg-[#2b2d31] hidden lg:block p-3 overflow-y-auto">
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