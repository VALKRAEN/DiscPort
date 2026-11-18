import type { VoiceApi } from '../useVoice'

type Props = {
  voice: VoiceApi
  channelName: string
}

export default function VoiceBar({ voice, channelName }: Props) {
  if (!voice.channelId) return null
  const connected = voice.status === 'connected'
  const btn = 'flex h-8 w-8 items-center justify-center rounded hover:bg-white/10 disabled:opacity-40'

  return (
    <div className="border-t border-black/20 bg-[#232428] px-3 py-2">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`text-xs font-semibold ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
            {connected ? 'Voice connected' : 'Connecting...'}
          </div>
          <div className="truncate text-xs text-gray-400">🔊 {channelName}</div>
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
        <button
          onClick={voice.leave}
          title="Leave voice"
          className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500 hover:text-white"
        >
          Leave
        </button>
      </div>
    </div>
  )
}