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

export default function ServerRail({ servers, activeId, homeActive, dmUnread, onHome, onSelect, onAdd }: Props) {
  return (
    <nav className="flex w-[72px] flex-col items-center gap-2 overflow-y-auto bg-[#1e1f22] py-3">
      <div className="relative shrink-0">
        <button
          onClick={onHome}
          title="Direct messages"
          className={`flex h-12 w-12 items-center justify-center text-2xl transition-all ${
            homeActive ? 'rounded-2xl bg-indigo-500' : 'rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-500'
          }`}
        >
          💬
        </button>
        {dmUnread > 0 && (
          <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#1e1f22] bg-red-500 px-1 text-xs font-bold">
            {dmUnread > 9 ? '9+' : dmUnread}
          </span>
        )}
      </div>

      <div className="h-px w-8 shrink-0 bg-white/10" />

      {servers.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          title={s.name}
          className={`h-12 w-12 shrink-0 font-bold transition-all ${s.color} ${
            s.id === activeId ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'
          }`}
        >
          {s.name[0]?.toUpperCase()}
        </button>
      ))}
      <button
        onClick={onAdd}
        title="Create or join a server"
        className="h-12 w-12 shrink-0 rounded-full bg-[#313338] text-2xl text-green-500 transition-all hover:rounded-2xl hover:bg-green-500 hover:text-white"
      >
        +
      </button>
    </nav>
  )
}