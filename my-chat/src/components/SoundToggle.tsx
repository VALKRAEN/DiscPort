import { useEffect, useRef, useState } from 'react'
import { getSoundsEnabled, getVolume, playSound, setSoundsEnabled, setVolume } from '../sounds'

export default function SoundToggle() {
  const [open, setOpen] = useState(false)
  const [on, setOn] = useState(getSoundsEnabled)
  const [vol, setVol] = useState(getVolume)
  const box = useRef<HTMLDivElement>(null)

  // Close when you click elsewhere or press Escape
  useEffect(() => {
    if (!open) return
    function away(e: MouseEvent | TouchEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('touchstart', away)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('touchstart', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  function toggle() {
    const next = !on
    setOn(next)
    setSoundsEnabled(next)
  }

  return (
    <div ref={box}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Sound settings"
        className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-[#313338] text-xl transition-all duration-150 hover:rounded-2xl hover:bg-[#404249]"
      >
        {on ? '🔔' : '🔕'}
      </button>

      {open && (
        <div className="fixed bottom-4 left-[84px] z-50 w-64 space-y-4 rounded-xl bg-[#111214] p-4 text-gray-100 shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Sounds</span>
            <button
              role="switch"
              aria-checked={on}
              onClick={toggle}
              className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  on ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <label className={`block ${on ? '' : 'opacity-40'}`}>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              disabled={!on}
              onChange={e => {
                const v = Number(e.target.value)
                setVol(v)
                setVolume(v)
              }}
              className="w-full accent-indigo-500"
            />
          </label>

          <button
            onClick={() => playSound('dm')}
            disabled={!on}
            className="w-full rounded-md bg-white/10 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-40"
          >
            Play test sound
          </button>
        </div>
      )}
    </div>
  )
}