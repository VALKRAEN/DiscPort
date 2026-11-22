import { useSyncExternalStore } from 'react'

export type ThemeName = 'classic' | 'darker' | 'midnight' | 'onyx'

export type Settings = {
  theme: ThemeName
  accent: string // '' means the default indigo
  messageStyle: 'cozy' | 'compact'
  chatFont: number
  showMembers: boolean
  micId: string
  cameraId: string
  speakerId: string
}

export const THEMES: { id: ThemeName; label: string; swatch: string[] }[] = [
  { id: 'classic', label: 'Classic', swatch: ['#1e1f22', '#2b2d31', '#313338'] },
  { id: 'darker', label: 'Darker', swatch: ['#0b0b0d', '#16171a', '#232428'] },
  { id: 'midnight', label: 'Midnight', swatch: ['#0e1019', '#151827', '#1a1d2e'] },
  { id: 'onyx', label: 'Onyx', swatch: ['#000000', '#0a0a0a', '#121212'] },
]

export const ACCENTS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']
export const DEFAULT_ACCENT_PREVIEW = '#6366f1'

const KEY = 'mychat.settings'
const HEX = /^#[0-9a-f]{6}$/i
const DEFAULTS: Settings = {
  theme: 'classic',
  accent: '',
  messageStyle: 'cozy',
  chatFont: 16,
  showMembers: true,
  micId: '',
  cameraId: '',
  speakerId: '',
}

function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const font = Number(r.chatFont)
  return {
    theme: THEMES.some(t => t.id === r.theme) ? (r.theme as ThemeName) : DEFAULTS.theme,
    accent: typeof r.accent === 'string' && HEX.test(r.accent) ? r.accent : '',
    messageStyle: r.messageStyle === 'compact' ? 'compact' : 'cozy',
    chatFont: Number.isFinite(font) ? Math.min(20, Math.max(12, Math.round(font))) : DEFAULTS.chatFont,
    showMembers: r.showMembers !== false,
    micId: str(r.micId),
    cameraId: str(r.cameraId),
    speakerId: str(r.speakerId),
  }
}

function load(): Settings {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return { ...DEFAULTS }
  }
}

// Blend a #rrggbb color toward black (target 0) or white (target 255)
function mix(hex: string, target: number, t: number) {
  const n = parseInt(hex.slice(1), 16)
  const parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.round(c + (target - c) * t))
  return '#' + parts.map(c => c.toString(16).padStart(2, '0')).join('')
}

function apply(s: Settings) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (s.theme === 'classic') delete root.dataset.theme
  else root.dataset.theme = s.theme

  // The whole app uses Tailwind's indigo for its accent, so changing these four values recolors everything
  const shades: Record<string, string | null> = {
    '--color-indigo-500': s.accent || null,
    '--color-indigo-600': s.accent ? mix(s.accent, 0, 0.18) : null,
    '--color-indigo-400': s.accent ? mix(s.accent, 255, 0.25) : null,
    '--color-indigo-300': s.accent ? mix(s.accent, 255, 0.45) : null,
  }
  for (const [name, value] of Object.entries(shades)) {
    if (value) root.style.setProperty(name, value)
    else root.style.removeProperty(name)
  }
  root.style.setProperty('--chat-font', `${s.chatFont}px`)
}

let current = load()
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>) {
  current = sanitize({ ...current, ...patch })
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* storage is blocked, so the setting just won't be remembered */
  }
  apply(current)
  listeners.forEach(l => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}

apply(current)