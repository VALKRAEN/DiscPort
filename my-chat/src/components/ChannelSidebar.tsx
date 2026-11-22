import { useEffect, useRef, useState } from 'react'
import type { Server, Profile, Role } from '../types'
import { rank } from '../roles'
import type { VoiceApi } from '../useVoice'
import VoiceBar from './VoiceBar'
import UserPanel from './UserPanel'
import Avatar from './Avatar'

type Props = {
  server: Server
  activeChannelId: string | undefined
  callOpen: boolean
  onSelect: (id: string) => void
  onJoinVoice: (id: string) => void
  profile: Profile
  myRole: Role
  voice: VoiceApi
  voiceOccupants: Record<string, { id: string; name: string }[]>
  avatarById: Record<string, string | null>
  voiceLabel: { channel: string; server: string } | null
  onOpenCall: () => void
  onAddChannel: () => void
  onOpenServerSettings: () => void
  onLeaveServer: () => void
  onOpenUserSettings: () => void
}

export default function ChannelSidebar({
  server,
  activeChannelId,
  callOpen,
  onSelect,
  onJoinVoice,
  profile,
  myRole,
  voice,
  voiceOccupants,
  avatarById,
  voiceLabel,
  onOpenCall,
  onAddChannel,
  onOpenServerSettings,
  onLeaveServer,
  onOpenUserSettings,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [textOpen, setTextOpen] = useState(true)
  const [voiceOpen, setVoiceOpen] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const canManage = rank[myRole] >= 3
  const textChannels = server.channels.filter(c => c.kind === 'text')
  const voiceChannels = server.channels.filter(c => c.kind === 'voice')

  useEffect(() => {
    if (!menuOpen) return
    function away(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [menuOpen])

  function copyCode() {
    navigator.clipboard.writeText(server.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const item = 'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-indigo-500 hover:text-white'
  const sectionBtn =
    'flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-gray-200'

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#2b2d31]">
      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex h-12 w-full items-center gap-2 px-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.25)] hover:bg-white/5"
        >
          <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-white">{server.name}</span>
          <span className="text-gray-300">{menuOpen ? '✕' : '⌄'}</span>
        </button>

        {menuOpen && (
          <div className="absolute left-2 right-2 top-[52px] z-20 rounded-lg bg-[#111214] p-2 shadow-xl ring-1 ring-white/10">
            <button onClick={copyCode} className={`${item} text-indigo-300`}>
              <span>{copied ? 'Copied!' : 'Invite People'}</span>
              <span className="font-mono text-xs opacity-70">{server.invite_code}</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onOpenServerSettings()
              }}
              className={item}
            >
              <span>Server Settings</span>
              <span>⚙</span>
            </button>
            {canManage && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onAddChannel()
                }}
                className={item}
              >
                <span>Create Channel</span>
                <span>＋</span>
              </button>
            )}
            {myRole !== 'owner' && (
              <>
                <div className="my-1 border-t border-white/10" />
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onLeaveServer()
                  }}
                  className={`${item} text-red-400`}
                >
                  <span>Leave Server</span>
                  <span>⎋</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-3">
        <div className="flex items-center justify-between px-4 pb-1.5 pt-5">
          <button onClick={() => setTextOpen(o => !o)} className={sectionBtn}>
            <span className={`inline-block text-[10px] transition-transform ${textOpen ? 'rotate-90' : ''}`}>▶</span>
            Text channels
          </button>
          {canManage && (
            <button
              onClick={onAddChannel}
              title="Create channel"
              className="flex h-7 w-7 items-center justify-center rounded text-2xl font-light leading-none text-gray-400 hover:bg-white/10 hover:text-white"
            >
              +
            </button>
          )}
        </div>
        {textOpen && (
          <div className="space-y-0.5 px-2">
            {textChannels.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[16px] font-medium ${
                  c.id === activeChannelId
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <span className="w-5 text-center text-xl leading-none text-gray-500">#</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {voiceChannels.length > 0 && (
          <>
            <div className="px-4 pb-1.5 pt-5">
              <button onClick={() => setVoiceOpen(o => !o)} className={sectionBtn}>
                <span className={`inline-block text-[10px] transition-transform ${voiceOpen ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                Voice channels
              </button>
            </div>
            {voiceOpen && (
              <div className="px-2">
                {voiceChannels.map(c => {
                  const joined = voice.channelId === c.id
                  const others = voiceOccupants[c.id] ?? []
                  return (
                    <div key={c.id} className="mb-0.5">
                      <button
                        onClick={() => onJoinVoice(c.id)}
                        disabled={voice.status === 'connecting'}
                        title={joined ? 'Open the call' : 'Click to join'}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[16px] font-medium disabled:opacity-60 ${
                          joined && callOpen
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        <span className="w-5 text-center text-lg leading-none">🔊</span>
                        <span className="truncate">{c.name}</span>
                      </button>

                      {joined && voice.status === 'connected'
                        ? voice.participants.map(p => (
                            <div key={p.id} className="flex items-center gap-2.5 py-1 pl-9 pr-2 text-sm text-gray-200">
                              <Avatar
                                id={p.id}
                                name={p.name}
                                path={avatarById[p.id]}
                                size={28}
                                className={p.speaking ? 'ring-2 ring-green-500' : ''}
                              />
                              <span className="min-w-0 flex-1 truncate">{p.name}</span>
                              {p.cameraOn && <span title="Camera on" className="text-xs">📷</span>}
                              {p.sharing &&
                                (p.isMe ? (
                                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    LIVE
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => voice.watch(p.id)}
                                    title="Watch stream"
                                    className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-600"
                                  >
                                    LIVE
                                  </button>
                                ))}
                              {p.muted && <span title="Muted" className="text-xs">🔇</span>}
                            </div>
                          ))
                        : others.map(p => (
                            <div key={p.id} className="flex items-center gap-2.5 py-1 pl-9 pr-2 text-sm text-gray-400">
                              <Avatar id={p.id} name={p.name} path={avatarById[p.id]} size={28} />
                              <span className="truncate">{p.name}</span>
                            </div>
                          ))}
                    </div>
                  )
                })}
                {voice.error && <p className="px-2.5 pt-1 text-xs text-red-400">{voice.error}</p>}
              </div>
            )}
          </>
        )}
      </div>

      <VoiceBar
        voice={voice}
        channelName={voiceLabel?.channel ?? ''}
        serverName={voiceLabel?.server}
        onOpenCall={onOpenCall}
      />
      <UserPanel profile={profile} voice={voice} onOpenSettings={onOpenUserSettings} />
    </aside>
  )
}