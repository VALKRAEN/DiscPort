import { useEffect, useRef, useState } from 'react'
import type { ScreenShare } from '../useVoice'

function VideoView({ share }: { share: ScreenShare }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    share.track.attach(el)
    return () => {
      share.track.detach(el)
    }
  }, [share.track])

  return <video ref={ref} autoPlay playsInline muted className="h-full w-full bg-black object-contain" />
}

type Props = { shares: ScreenShare[] }

export default function ScreenStage({ shares }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // A new stream starting brings the stage back
  const key = shares.map(s => s.id).join(',')
  useEffect(() => {
    setHidden(false)
  }, [key])

  if (shares.length === 0) return null
  const current = shares.find(s => s.id === selectedId) ?? shares[0]

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="shrink-0 border-b border-black/30 bg-[#232428] px-4 py-2 text-left text-sm text-green-400 hover:bg-[#2b2d31]"
      >
        📺 {current.name} is sharing their screen. Tap to watch
      </button>
    )
  }

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
    <div className="shrink-0 border-b border-black/30 bg-black">
      <div className="flex items-center gap-2 bg-[#232428] px-3 py-1.5 text-sm">
        <span className="min-w-0 flex-1 truncate">📺 {current.name}'s screen</span>
        {shares.length > 1 &&
          shares.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`rounded px-2 py-1 text-xs ${
                s.id === current.id ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {s.name}
            </button>
          ))}
        <button onClick={fullscreen} title="Fullscreen" className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
          ⛶
        </button>
        <button onClick={() => setHidden(true)} title="Hide" className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
          Hide
        </button>
      </div>
      <div ref={box} className="h-[40dvh] md:h-[50dvh]">
        <VideoView key={current.id} share={current} />
      </div>
    </div>
  )
}