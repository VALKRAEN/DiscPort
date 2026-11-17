import type { Server } from '../types'

type Props = {
  servers: Server[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
}

export default function ServerRail({ servers, activeId, onSelect, onAdd }: Props) {
  return (
    <nav className="w-[72px] bg-[#1e1f22] flex flex-col items-center gap-2 py-3 overflow-y-auto">
      {servers.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          title={s.name}
          className={`w-12 h-12 shrink-0 font-bold transition-all ${s.color} ${
            s.id === activeId ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'
          }`}
        >
          {s.name[0]?.toUpperCase()}
        </button>
      ))}
      <button
        onClick={onAdd}
        title="Create or join a server"
        className="w-12 h-12 shrink-0 rounded-full bg-[#313338] text-green-500 text-2xl hover:rounded-2xl hover:bg-green-500 hover:text-white transition-all"
      >
        +
      </button>
    </nav>
  )
}