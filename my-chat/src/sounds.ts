export type SoundName =
  | 'message'
  | 'dm'
  | 'friend'
  | 'join'
  | 'leave'
  | 'selfJoin'
  | 'selfLeave'
  | 'mute'
  | 'unmute'
  | 'deafen'
  | 'undeafen'

// Each note is [pitch in Hz, start time in seconds, length in seconds]
type Note = [number, number, number]

const NOTES: Record<SoundName, Note[]> = {
  message: [[880, 0, 0.12], [1175, 0.09, 0.16]],
  dm: [[784, 0, 0.14], [988, 0.12, 0.14], [1319, 0.24, 0.24]],
  friend: [[659, 0, 0.12], [784, 0.11, 0.12], [988, 0.22, 0.12], [1319, 0.33, 0.28]],
  join: [[523, 0, 0.1], [784, 0.09, 0.2]],
  leave: [[784, 0, 0.1], [523, 0.09, 0.22]],
  selfJoin: [[523, 0, 0.1], [659, 0.09, 0.1], [880, 0.18, 0.24]],
  selfLeave: [[880, 0, 0.1], [659, 0.09, 0.1], [440, 0.18, 0.26]],
  mute: [[392, 0, 0.09], [294, 0.07, 0.13]],
  unmute: [[294, 0, 0.09], [392, 0.07, 0.13]],
  deafen: [[440, 0, 0.09], [330, 0.08, 0.09], [247, 0.16, 0.16]],
  undeafen: [[247, 0, 0.09], [330, 0.08, 0.09], [440, 0.16, 0.16]],
}

const ON_KEY = 'mychat.sounds.on'
const VOLUME_KEY = 'mychat.sounds.volume'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage is blocked, so the setting just won't be remembered */
  }
}

export function getSoundsEnabled(): boolean {
  return read(ON_KEY) !== '0'
}

export function setSoundsEnabled(on: boolean) {
  write(ON_KEY, on ? '1' : '0')
}

export function getVolume(): number {
  const saved = read(VOLUME_KEY)
  const v = saved === null ? 0.6 : Number(saved)
  return Number.isNaN(v) ? 0.6 : Math.min(1, Math.max(0, v))
}

export function setVolume(v: number) {
  write(VOLUME_KEY, String(Math.min(1, Math.max(0, v))))
}

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor() as AudioContext
  return ctx
}

// Browsers keep audio switched off until you have clicked or typed on the page
function unlock() {
  const c = getContext()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(type, unlock, { passive: true })
  }
}

const lastPlayed: Partial<Record<SoundName, number>> = {}

export function playSound(name: SoundName) {
  if (!getSoundsEnabled()) return

  // Never play the same sound twice within a split second
  const now = Date.now()
  if (now - (lastPlayed[name] ?? 0) < 150) return
  lastPlayed[name] = now

  const c = getContext()
  if (!c) return
  if (c.state !== 'running') {
    c.resume().catch(() => {})
    return
  }

  const out = c.createGain()
  out.gain.value = getVolume()
  out.connect(c.destination)

  const t0 = c.currentTime + 0.01
  for (const [freq, at, dur] of NOTES[name]) {
    const osc = c.createOscillator()
    const env = c.createGain()
    const start = t0 + at
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(0.3, start + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(env)
    env.connect(out)
    osc.start(start)
    osc.stop(start + dur + 0.03)
  }
}