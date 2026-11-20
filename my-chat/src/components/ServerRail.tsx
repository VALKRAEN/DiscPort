import type { Server } from '../types'

type Props = {
  servers: Server[]
  activeId: string | null
  homeActive: boolean
  dmUnread: number
  onHome: () => void
  onSelect: (id: string) => void
  onAdd: () => void
}

function Pill({ active }: { active: boolean }) {
  return (
    <span
      className={`absolute left-0 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all ${
        active ? 'h-10' : 'h-0 group-hover:h-5'
      }`}
    />
  )
}

export default function ServerRail({ servers, activeId, homeActive, dmUnread, onHome, onSelect, onAdd }: Props) {
  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-[#1e1f22] py-3">
      <div className="group relative flex w-full justify-center">
        <Pill active={homeActive} />
        <button
          onClick={onHome}
          title="Direct messages"
          className={`relative flex h-12 w-12 items-center justify-center text-2xl transition-all duration-150 ${
            homeActive
              ? 'rounded-2xl bg-indigo-500'
              : 'rounded-[24px] bg-[#313338] hover:rounded-2xl hover:bg-indigo-500'
          }`}
        >
          💬
          {dmUnread > 0 && (
            <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#1e1f22] bg-red-500 px-1 text-xs font-bold text-white">
              {dmUnread > 9 ? '9+' : dmUnread}
            </span>
          )}
        </button>
      </div>

      <div className="h-0.5 w-8 shrink-0 rounded bg-white/10" />

      {servers.map(s => {
        const active = s.id === activeId
        return (
          <div key={s.id} className="group relative flex w-full justify-center">
            <Pill active={active} />
            <button
              onClick={() => onSelect(s.id)}
              title={s.name}
              className={`flex h-12 w-12 items-center justify-center text-lg font-bold text-white transition-all duration-150 ${s.color} ${
                active ? 'rounded-2xl' : 'rounded-[24px] group-hover:rounded-2xl'
              }`}
            >
              {s.name[0]?.toUpperCase()}
            </button>
          </div>
        )
      })}

      <button
        onClick={onAdd}
        title="Create or join a server"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[24px] bg-[#313338] text-3xl font-light text-green-500 transition-all duration-150 hover:rounded-2xl hover:bg-green-500 hover:text-white"
      >
        +
      </button>
    </nav>
  )
}