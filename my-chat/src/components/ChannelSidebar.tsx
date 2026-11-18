import { useState } from 'react'
import type { Server, Profile, Role } from '../types'
import { colorFor } from '../colors'
import { rank } from '../roles'
import type { VoiceApi } from '../useVoice'
import VoiceBar from './VoiceBar'

type Props = {
  server: Server
  activeChannelId: string | undefined
  onSelect: (id: string) => void
  profile: Profile
  myRole: Role
  voice: VoiceApi
  voiceOccupants: Record<string, { id: string; name: string }[]>
  onAddChannel: () => void
  onOpenSettings: () => void
  onEditProfile: () => void
  onSignOut: () => void
}

export default function ChannelSidebar({
  server,
  activeChannelId,
  onSelect,
  profile,
  myRole,
  voice,
  voiceOccupants,
  onAddChannel,
  onOpenSettings,
  onEditProfile,
  onSignOut,
}: Props) {
  const [copied, setCopied] = useState(false)
  const canManage = rank[myRole] >= 3
  const textChannels = server.channels.filter(c => c.kind === 'text')
  const voiceChannels = server.channels.filter(c => c.kind === 'voice')
  const joinedChannel = server.channels.find(c => c.id === voice.channelId)

  function copyCode() {
    navigator.clipboard.writeText(server.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <aside className="w-60 bg-[#2b2d31] flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-black/20">
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{server.name}</div>
          <button onClick={copyCode} className="text-xs text-gray-400 hover:text-white" title="Click to copy">
            {copied ? 'Copied!' : `Invite code: ${server.invite_code}`}
          </button>
        </div>
        <button onClick={onOpenSettings} title="Server settings" className="text-xl text-gray-400 hover:text-white">
          ⚙
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-1 text-xs font-semibold uppercase text-gray-400">
          <span>Text channels</span>
          {canManage && (
            <button onClick={onAddChannel} title="Create channel" className="text-lg leading-none hover:text-white">
              +
            </button>
          )}
        </div>
        <div className="px-2 pb-2 space-y-1">
          {textChannels.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-2 py-1 rounded truncate ${
                c.id === activeChannelId ? 'bg-white/15' : 'hover:bg-white/10 text-gray-400'
              }`}
            >
              # {c.name}
            </button>
          ))}
        </div>

        {voiceChannels.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase text-gray-400">Voice channels</div>
            <div className="px-2 pb-2">
              {voiceChannels.map(c => {
                const joined = voice.channelId === c.id
                const others = voiceOccupants[c.id] ?? []
                return (
                  <div key={c.id} className="mb-1">
                    <button
                      onClick={() => voice.join(c.id)}
                      disabled={voice.status === 'connecting'}
                      title={joined ? 'You are in this channel' : 'Click to join'}
                      className={`w-full text-left px-2 py-1 rounded truncate disabled:opacity-60 ${
                        joined ? 'bg-white/15' : 'hover:bg-white/10 text-gray-400'
                      }`}
                    >
                      🔊 {c.name}
                    </button>

                    {joined && voice.status === 'connected'
                      ? voice.participants.map(p => (
                          <div key={p.id} className="ml-5 flex items-center gap-2 py-0.5 text-sm text-gray-300">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorFor(
                                p.id
                              )} ${p.speaking ? 'ring-2 ring-green-500' : ''}`}
                            >
                              {p.name[0]?.toUpperCase()}
                            </span>
                            <span className="truncate">{p.name}</span>
                            {p.muted && <span title="Muted" className="text-xs">🔇</span>}
                          </div>
                        ))
                      : others.map(p => (
                          <div key={p.id} className="ml-5 flex items-center gap-2 py-0.5 text-sm text-gray-400">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${colorFor(
                                p.id
                              )}`}
                            >
                              {p.name[0]?.toUpperCase()}
                            </span>
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                  </div>
                )
              })}
              {voice.error && <p className="px-2 pt-1 text-xs text-red-400">{voice.error}</p>}
            </div>
          </>
        )}
      </div>

      <VoiceBar voice={voice} channelName={joinedChannel?.name ?? ''} />

      <div className="h-[52px] bg-[#232428] px-3 flex items-center gap-2">
        <div
          className={`w-8 h-8 shrink-0 rounded-full ${colorFor(profile.id)} flex items-center justify-center text-sm font-bold`}
        >
          {profile.display_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{profile.display_name}</div>
          <div className="truncate text-xs text-gray-400">@{profile.username}</div>
        </div>
        <button onClick={onEditProfile} title="Edit profile" className="text-xs text-gray-400 hover:text-white">
          Edit
        </button>
        <button onClick={onSignOut} title="Sign out" className="text-xs text-gray-400 hover:text-white">
          Out
        </button>
      </div>
    </aside>
  )
}