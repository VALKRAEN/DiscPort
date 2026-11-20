import { useState } from 'react'
import type { Server, Profile, Role } from '../types'
import { rank } from '../roles'
import type { VoiceApi } from '../useVoice'
import VoiceBar from './VoiceBar'
import Avatar from './Avatar'

type Props = {
  server: Server
  activeChannelId: string | undefined
  onSelect: (id: string) => void
  profile: Profile
  myRole: Role
  voice: VoiceApi
  voiceOccupants: Record<string, { id: string; name: string }[]>
  avatarById: Record<string, string | null>
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
  avatarById,
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

  const sectionHeader =
    'flex items-center justify-between px-4 pb-1.5 pt-5 text-xs font-bold uppercase tracking-wide text-gray-400'

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#2b2d31]">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4 shadow-[0_1px_0_rgba(0,0,0,0.25)]">
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-white">{server.name}</span>
        <button
          onClick={onOpenSettings}
          title="Server settings"
          className="flex h-9 w-9 items-center justify-center rounded-md text-xl text-gray-400 hover:bg-white/10 hover:text-white"
        >
          ⚙
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-3">
        <button
          onClick={copyCode}
          title="Click to copy the invite code"
          className="mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-lg bg-[#232428] px-3 py-2.5 text-left hover:bg-[#1e1f22]"
        >
          <span className="text-xl">✉️</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">Invite code</span>
            <span className="block truncate font-mono text-sm text-gray-100">{server.invite_code}</span>
          </span>
          <span className="text-xs font-medium text-indigo-300">{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        <div className={sectionHeader}>
          <span>Text channels</span>
          {canManage && (
            <button
              onClick={onAddChannel}
              title="Create channel"
              className="flex h-7 w-7 items-center justify-center rounded text-2xl font-light leading-none hover:bg-white/10 hover:text-white"
            >
              +
            </button>
          )}
        </div>
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

        {voiceChannels.length > 0 && (
          <>
            <div className={sectionHeader}>
              <span>Voice channels</span>
            </div>
            <div className="px-2">
              {voiceChannels.map(c => {
                const joined = voice.channelId === c.id
                const others = voiceOccupants[c.id] ?? []
                return (
                  <div key={c.id} className="mb-0.5">
                    <button
                      onClick={() => voice.join(c.id)}
                      disabled={voice.status === 'connecting'}
                      title={joined ? 'You are in this channel' : 'Click to join'}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[16px] font-medium disabled:opacity-60 ${
                        joined ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
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
          </>
        )}
      </div>

      <VoiceBar
        voice={voice}
        channelName={voiceLabel?.channel ?? ''}
        serverName={voiceLabel && !voiceLabel.here ? voiceLabel.server : undefined}
        onGoTo={voiceLabel && !voiceLabel.here ? onGoToVoice : undefined}
      />

      <div className="flex h-[60px] shrink-0 items-center gap-1 bg-[#232428] px-3">
        <Avatar id={profile.id} name={profile.display_name} path={profile.avatar_path} size={36} className="mr-2" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold text-white">{profile.display_name}</div>
          <div className="truncate text-xs text-gray-400">@{profile.username}</div>
        </div>
        <button
          onClick={onEditProfile}
          title="Edit profile"
          className="rounded-md px-2.5 py-2 text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-white"
        >
          Edit
        </button>
        <button
          onClick={onSignOut}
          title="Sign out"
          className="rounded-md px-2.5 py-2 text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-white"
        >
          Out
        </button>
      </div>
    </aside>
  )
}