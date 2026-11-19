import { canShareScreen } from '../useVoice'
import type { VoiceApi } from '../useVoice'

type Props = {
  voice: VoiceApi
  channelName: string
  serverName?: string // shown when your call is in a different server than the one you're viewing
  onGoTo?: () => void
  edge?: 'top' | 'bottom' // which side gets the divider line
}

export default function VoiceBar({ voice, channelName, serverName, onGoTo, edge = 'top' }: Props) {
  if (!voice.channelId) return null
  const connected = voice.status === 'connected'
  const btn =
    'flex h-10 w-10 items-center justify-center rounded hover:bg-white/10 disabled:opacity-40 md:h-8 md:w-8'
  const label = `🔊 ${channelName}${serverName ? ` · ${serverName}` : ''}`

  return (
    <div className={`${edge === 'bottom' ? 'border-b' : 'border-t'} border-black/20 bg-[#232428] px-3 py-2`}>
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`text-xs font-semibold ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
            {connected ? (voice.sharing ? 'Voice connected · sharing' : 'Voice connected') : 'Connecting...'}
          </div>
          {onGoTo ? (
            <button
              onClick={onGoTo}
              title="Go to this call's server"
              className="block max-w-full truncate text-left text-xs text-gray-400 hover:text-white"
            >
              {label}
            </button>
          ) : (
            <div className="truncate text-xs text-gray-400">{label}</div>
          )}
        </div>
        <button
          onClick={voice.toggleMute}
          disabled={!connected}
          title={voice.muted ? 'Unmute' : 'Mute'}
          className={btn}
        >
          {voice.muted ? '🔇' : '🎤'}
        </button>
        <button
          onClick={voice.toggleDeafen}
          disabled={!connected}
          title={voice.deafened ? 'Undeafen' : 'Deafen'}
          className={btn}
        >
          {voice.deafened ? '🔕' : '🎧'}
        </button>
        {canShareScreen && (
          <button
            onClick={voice.toggleScreenShare}
            disabled={!connected}
            title={voice.sharing ? 'Stop sharing' : 'Share your screen'}
            className={`${btn} ${voice.sharing ? 'bg-green-500/30 text-green-400' : ''}`}
          >
            🖥
          </button>
        )}
        <button
          onClick={voice.leave}
          title="Leave voice"
          className="rounded bg-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500 hover:text-white md:px-2 md:py-1"
        >
          Leave
        </button>
      </div>
    </div>
  )
}