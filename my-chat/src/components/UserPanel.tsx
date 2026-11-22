import type { Profile } from '../types'
import type { VoiceApi } from '../useVoice'
import Avatar from './Avatar'

type Props = {
  profile: Profile
  voice: VoiceApi
  onOpenSettings: () => void
}

export default function UserPanel({ profile, voice, onOpenSettings }: Props) {
  const live = voice.status === 'connected'
  const btn =
    'flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="flex h-[60px] shrink-0 items-center gap-0.5 bg-[#232428] px-2">
      <button
        onClick={onOpenSettings}
        title="User settings"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-white/10"
      >
        <span className="relative shrink-0">
          <Avatar id={profile.id} name={profile.display_name} path={profile.avatar_path} size={36} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#232428] bg-green-500" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold text-white">{profile.display_name}</span>
          <span className="block truncate text-xs text-gray-400">@{profile.username}</span>
        </span>
      </button>

      <button
        onClick={voice.toggleMute}
        disabled={!live}
        title={live ? (voice.muted ? 'Unmute' : 'Mute') : 'Join a voice channel to use your mic'}
        className={`${btn} ${voice.muted && live ? 'text-red-400' : ''}`}
      >
        {voice.muted && live ? '🔇' : '🎤'}
      </button>
      <button
        onClick={voice.toggleDeafen}
        disabled={!live}
        title={live ? (voice.deafened ? 'Undeafen' : 'Deafen') : 'Join a voice channel first'}
        className={`${btn} ${voice.deafened ? 'text-red-400' : ''}`}
      >
        {voice.deafened ? '🔕' : '🎧'}
      </button>
      <button onClick={onOpenSettings} title="User settings" className={btn}>
        ⚙
      </button>
    </div>
  )
}