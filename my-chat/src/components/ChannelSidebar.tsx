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
  voiceLabel: { channel: string; server: string; here: boolean } | null
  onGoToVoice: () => void
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
  voiceLabel,
  onGoToVoice,
  onAddChannel,
  onOpenSettings,
  onEditProfile,
  onSignOut,
}: Props) {
  const [copied, setCopied] = useState(false)
  const canManage = rank[myRole] >= 3
  const textChannels = server.channels.filter(c => c.kind === 'text')
  const voiceChannels = server.channels.filter(c => c.kind === 'voice')

  function copyCode() {
    navigator.clipboard.writeText(server.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <aside className="flex w-60 flex-col bg-[#2b2d31]">
      <div className="flex items-center gap-1 border-b border-black/20 px-4 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{server.name}</div>
          <button onClick={copyCode} className="py-1 text-xs text-gray-400 hover:text-white" title="Click to copy">
            {copied ? 'Copied!' : `Invite code: ${server.invite_code}`}
          </button>
        </div>
        <button
          onClick={onOpenSettings}
          title="Server settings"
          className="px-2 py-1 text-2xl text-gray-400 hover:text-white"
        >
          ⚙
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-1 text-xs font-semibold uppercase text-gray-400">
          <span>Text channels</span>
          {canManage && (
            <button
              onClick={onAddChannel}
              title="Create channel"
              className="-my-1 px-2 py-1 text-2xl leading-none hover:text-white"
            >
              +
            </button>
          )}
        </div>
        <div className="space-y-1 px-2 pb-2">
          {textChannels.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full truncate rounded px-2 py-2 text-left md:py-1 ${
                c.id === activeChannelId ? 'bg-white/15' : 'text-gray-400 hover:bg-white/10'
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
                      className={`w-full truncate rounded px-2 py-2 text-left disabled:opacity-60 md:py-1 ${
                        joined ? 'bg-white/15' : 'text-gray-400 hover:bg-white/10'
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
                            {p.sharing && (
                              <span className="rounded bg-red-500 px-1 text-[10px] font-bold text-white">LIVE</span>
                            )}
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

      <VoiceBar
        voice={voice}
        channelName={voiceLabel?.channel ?? ''}
        serverName={voiceLabel && !voiceLabel.here ? voiceLabel.server : undefined}
        onGoTo={voiceLabel && !voiceLabel.here ? onGoToVoice : undefined}
      />

      <div className="flex h-[52px] items-center gap-1 bg-[#232428] px-3">
        <div
          className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colorFor(
            profile.id
          )}`}
        >
          {profile.display_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{profile.display_name}</div>
          <div className="truncate text-xs text-gray-400">@{profile.username}</div>
        </div>
        <button onClick={onEditProfile} title="Edit profile" className="px-2 py-2 text-xs text-gray-400 hover:text-white">
          Edit
        </button>
        <button onClick={onSignOut} title="Sign out" className="px-2 py-2 text-xs text-gray-400 hover:text-white">
          Out
        </button>
      </div>
    </aside>
  )
}