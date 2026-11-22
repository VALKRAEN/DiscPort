import { useEffect, useRef, useState } from 'react'
import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client'
import { canShareScreen } from '../useVoice'
import type { ScreenShare, VoiceApi, VoiceParticipant } from '../useVoice'
import Avatar from './Avatar'

type VideoTrack = LocalVideoTrack | RemoteVideoTrack

function TrackVideo({ track, mirror = false, fit }: { track: VideoTrack; mirror?: boolean; fit: 'cover' | 'contain' }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`h-full w-full bg-black ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${
        mirror ? '-scale-x-100' : ''
      }`}
    />
  )
}

function PersonTile({ p, avatar, small = false }: { p: VoiceParticipant; avatar?: string | null; small?: boolean }) {
  return (
    <div
      className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-[#232428] ${
        p.speaking ? 'ring-2 ring-green-500' : 'ring-1 ring-white/5'
      }`}
    >
      {p.camera ? (
        <TrackVideo track={p.camera} mirror={p.isMe} fit="cover" />
      ) : (
        <Avatar id={p.id} name={p.name} path={avatar} size={small ? 40 : 88} />
      )}
      <div className="absolute bottom-2 left-2 flex max-w-[85%] items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-sm text-white">
        {p.muted && <span className="text-xs">🔇</span>}
        <span className="truncate">
          {p.name}
          {p.isMe ? ' (you)' : ''}
        </span>
      </div>
      {p.sharing && (
        <span className="absolute right-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          LIVE
        </span>
      )}
    </div>
  )
}

function ShareBody({ share, voice }: { share: ScreenShare; voice: VoiceApi }) {
  if (share.isMe) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xl font-semibold text-white">You're sharing your screen</p>
        <button
          onClick={voice.toggleScreenShare}
          className="rounded-md bg-red-500 px-5 py-2.5 font-semibold text-white hover:bg-red-600"
        >
          Stop sharing
        </button>
      </div>
    )
  }
  if (!share.watching) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xl font-semibold text-white">{share.name} is sharing their screen</p>
        <p className="text-sm text-gray-400">You stopped watching, so nothing is being downloaded.</p>
        <button
          onClick={() => voice.watch(share.id)}
          className="rounded-md bg-indigo-500 px-6 py-2.5 font-semibold text-white hover:bg-indigo-600"
        >
          Watch stream
        </button>
      </div>
    )
  }
  if (!share.track) {
    return <div className="flex h-full items-center justify-center text-gray-400">Connecting to the stream...</div>
  }
  return <TrackVideo track={share.track} fit="contain" />
}

type Props = {
  voice: VoiceApi
  channelName: string
  avatarById: Record<string, string | null>
  onOpenNav: () => void
  navBadge: number
}

export default function CallView({ voice, channelName, avatarById, onOpenNav, navBadge }: Props) {
  const [focusId, setFocusId] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const people = voice.participants
  const shares = voice.screens
  const focus = shares.find(s => s.id === focusId) ?? shares[0] ?? null
  const connected = voice.status === 'connected'
  const n = people.length
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4

  function fullscreen() {
    const el = box.current
    if (!el) return
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else (el.querySelector('video') as any)?.webkitEnterFullscreen?.()
  }

  const ctl = 'flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors disabled:opacity-40'
  const idle = 'bg-[#2b2d31] hover:bg-[#35373c]'

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 px-2 shadow-[0_1px_0_rgba(0,0,0,0.25)] md:px-4">
        <button
          onClick={onOpenNav}
          title="Servers and channels"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl hover:bg-white/10 md:hidden"
        >
          ☰
          {navBadge > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
        </button>
        <span className="text-xl">🔊</span>
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-white">{channelName}</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#1e1f22] p-3 md:p-4">
        {voice.error && <p className="mx-auto mb-3 max-w-3xl rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{voice.error}</p>}

        {!connected ? (
          <div className="flex h-full items-center justify-center text-gray-400">Connecting...</div>
        ) : focus ? (
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
              <div className="flex flex-wrap items-center gap-2 bg-[#232428] px-4 py-3 text-sm">
                <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-white">
                  {focus.isMe ? 'Your screen' : `${focus.name}'s screen`}
                </span>
                {shares.length > 1 &&
                  shares.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setFocusId(s.id)}
                      className={`rounded-md px-2.5 py-1 text-xs ${
                        s.id === focus.id ? 'bg-indigo-500 text-white' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {s.isMe ? 'You' : s.name}
                    </button>
                  ))}
                {!focus.isMe && focus.watching && focus.track && (
                  <button onClick={fullscreen} title="Fullscreen" className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20">
                    ⛶
                  </button>
                )}
                {!focus.isMe && focus.watching && (
                  <button
                    onClick={() => voice.stopWatching(focus.id)}
                    className="rounded-md bg-red-500/20 px-3 py-1.5 font-medium text-red-400 hover:bg-red-500 hover:text-white"
                  >
                    Stop watching
                  </button>
                )}
              </div>
              <div ref={box} className="aspect-video max-h-[60dvh] w-full">
                <ShareBody share={focus} voice={voice} />
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {people.map(p => (
                <div key={p.id} className="w-44 shrink-0">
                  <PersonTile p={p} avatar={avatarById[p.id]} small />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`mx-auto grid w-full gap-3 ${n === 1 ? 'max-w-3xl' : 'max-w-6xl'}`}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {people.map(p => (
              <PersonTile key={p.id} p={p} avatar={avatarById[p.id]} />
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-3 bg-[#1e1f22] px-4 pb-5 pt-3">
        <button
          onClick={voice.toggleCamera}
          disabled={!connected}
          title={voice.cameraOn ? 'Turn off camera' : 'Turn on camera'}
          className={`${ctl} ${voice.cameraOn ? 'bg-white text-black' : idle}`}
        >
          📷
        </button>
        {canShareScreen && (
          <button
            onClick={voice.toggleScreenShare}
            disabled={!connected}
            title={voice.sharing ? 'Stop sharing' : 'Share your screen'}
            className={`${ctl} ${voice.sharing ? 'bg-green-500 text-white' : idle}`}
          >
            🖥
          </button>
        )}
        <button
          onClick={voice.toggleMute}
          disabled={!connected}
          title={voice.muted ? 'Unmute' : 'Mute'}
          className={`${ctl} ${voice.muted ? 'bg-red-500 text-white' : idle}`}
        >
          {voice.muted ? '🔇' : '🎤'}
        </button>
        <button
          onClick={voice.toggleDeafen}
          disabled={!connected}
          title={voice.deafened ? 'Undeafen' : 'Deafen'}
          className={`${ctl} ${voice.deafened ? 'bg-red-500 text-white' : idle}`}
        >
          {voice.deafened ? '🔕' : '🎧'}
        </button>
        <button
          onClick={voice.leave}
          title="Disconnect"
          className={`${ctl} bg-red-500 text-white hover:bg-red-600`}
        >
          📞
        </button>
      </div>
    </main>
  )
}