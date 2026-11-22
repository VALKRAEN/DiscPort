import { canShareScreen } from '../useVoice'
import type { VoiceApi } from '../useVoice'

type Props = {
  voice: VoiceApi
  channelName: string
  serverName?: string
  onOpenCall: () => void
  edge?: 'top' | 'bottom' // which side gets the divider line
}

export default function VoiceBar({ voice, channelName, serverName, onOpenCall, edge = 'top' }: Props) {
  if (!voice.channelId) return null
  const connected = voice.status === 'connected'
  const btn =
    'flex h-9 flex-1 items-center justify-center rounded-md bg-white/5 text-lg hover:bg-white/10 disabled:opacity-40'

  return (
    <div className={`${edge === 'bottom' ? 'border-b' : 'border-t'} border-black/25 bg-[#232428] px-3 py-2.5`}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`text-sm font-semibold ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
            {connected ? 'Voice Connected' : 'Connecting...'}
          </div>
          <button
            onClick={onOpenCall}
            title="Open the call"
            className="block max-w-full truncate pt-0.5 text-left text-xs text-gray-400 hover:text-white hover:underline"
          >
            {channelName}
            {serverName ? ` / ${serverName}` : ''}
          </button>
        </div>
        <button
          onClick={voice.leave}
          title="Disconnect"
          className="flex h-9 w-9 items-center justify-center rounded-md text-lg text-gray-300 hover:bg-white/10 hover:text-red-400"
        >
          📞
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={voice.toggleCamera}
          disabled={!connected}
          title={voice.cameraOn ? 'Turn off camera' : 'Turn on camera'}
          className={`${btn} ${voice.cameraOn ? '!bg-white !text-black' : ''}`}
        >
          📷
        </button>
        {canShareScreen && (
          <button
            onClick={voice.toggleScreenShare}
            disabled={!connected}
            title={voice.sharing ? 'Stop sharing' : 'Share your screen'}
            className={`${btn} ${voice.sharing ? '!bg-green-500/30 text-green-400' : ''}`}
          >
            🖥
          </button>
        )}
        <button onClick={onOpenCall} title="Open the call" className={btn}>
          ⤢
        </button>
      </div>
    </div>
  )
}