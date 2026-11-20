import { useEffect, useRef, useState } from 'react'
import type { ScreenShare, VoiceApi } from '../useVoice'

function VideoView({ share }: { share: ScreenShare }) {
  const ref = useRef<HTMLVideoElement>(null)
  const track = share.track

  useEffect(() => {
    const el = ref.current
    if (!el || !track) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])

  return <video ref={ref} autoPlay playsInline muted className="h-full w-full bg-black object-contain" />
}

export default function ScreenStage({ voice }: { voice: VoiceApi }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)

  const remote = voice.screens.filter(s => !s.isMe)
  const mine = voice.screens.find(s => s.isMe)
  if (remote.length === 0 && !mine) return null

  const current = remote.find(s => s.id === selectedId) ?? remote[0]

  function fullscreen() {
    const el = box.current
    if (!el) return
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    } else {
      // iPhones only allow fullscreen on the video element itself
      ;(el.querySelector('video') as any)?.webkitEnterFullscreen?.()
    }
  }

  return (
    <div className="shrink-0">
      {mine && (
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl bg-[#2b2d31] px-4 py-3 text-sm ring-1 ring-green-500/40">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="flex-1">You're sharing your screen</span>
          <button
            onClick={voice.toggleScreenShare}
            className="rounded-md bg-red-500 px-3 py-1.5 font-semibold hover:bg-red-600"
          >
            Stop sharing
          </button>
        </div>
      )}

      {current && (
        <div className="mx-3 mt-3 overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
          <div className="flex flex-wrap items-center gap-2 bg-[#1e1f22] px-4 py-3 text-sm">
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase">Live</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{current.name}'s screen</span>

            {remote.length > 1 &&
              remote.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`rounded-md px-2.5 py-1 text-xs ${
                    s.id === current.id ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {s.name}
                </button>
              ))}

            {current.watching && current.track && (
              <button
                onClick={fullscreen}
                title="Fullscreen"
                className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20"
              >
                ⛶
              </button>
            )}
            {current.watching && (
              <button
                onClick={() => voice.stopWatching(current.id)}
                className="rounded-md bg-red-500/20 px-3 py-1.5 font-medium text-red-400 hover:bg-red-500 hover:text-white"
              >
                Stop watching
              </button>
            )}
          </div>

          {current.watching ? (
            <div ref={box} className="h-[45dvh] md:h-[52dvh]">
              {current.track ? (
                <VideoView key={current.id} share={current} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">Connecting to the stream...</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-xl font-semibold">{current.name} is sharing their screen</p>
              <p className="text-sm text-gray-400">You stopped watching, so nothing is being downloaded.</p>
              <button
                onClick={() => voice.watch(current.id)}
                className="mt-2 rounded-md bg-indigo-500 px-6 py-2.5 font-semibold hover:bg-indigo-600"
              >
                Watch stream
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}