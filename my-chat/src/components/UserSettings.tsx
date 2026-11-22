import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'
import type { Profile } from '../types'
import { makeAvatarBlob } from '../avatars'
import { ACCENTS, DEFAULT_ACCENT_PREVIEW, THEMES, updateSettings, useSettings } from '../settings'
import type { Settings } from '../settings'
import { getSoundsEnabled, getVolume, playSound, setSoundsEnabled, setVolume } from '../sounds'
import type { SoundName } from '../sounds'
import type { VoiceApi } from '../useVoice'
import Avatar from './Avatar'
import NotificationSettings from './NotificationSettings'

type Tab = 'account' | 'appearance' | 'voice' | 'sounds' | 'notifications'

const NAV: { group: string; items: { id: Tab; label: string; icon: string }[] }[] = [
  {
    group: 'User settings',
    items: [
      { id: 'account', label: 'My Account', icon: '👤' },
      { id: 'appearance', label: 'Appearance', icon: '🎨' },
    ],
  },
  {
    group: 'App settings',
    items: [
      { id: 'voice', label: 'Voice & Video', icon: '🎙' },
      { id: 'sounds', label: 'Sounds', icon: '🔔' },
      { id: 'notifications', label: 'Notifications', icon: '📲' },
    ],
  },
]

const TITLES: Record<Tab, string> = {
  account: 'My Account',
  appearance: 'Appearance',
  voice: 'Voice & Video',
  sounds: 'Sounds',
  notifications: 'Notifications',
}

const card = 'mb-6 rounded-xl bg-[#2b2d31] p-5'
const heading = 'mb-2 block text-xs font-bold uppercase tracking-wide text-gray-300'
const input = 'w-full rounded-md bg-[#1e1f22] px-3 py-3 text-base outline-none'

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-gray-600'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  )
}

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-white">{title}</div>
        {desc && <div className="text-sm text-gray-400">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

/* ---------------- My Account ---------------- */

function AccountTab({
  profile,
  email,
  onSaved,
}: {
  profile: Profile
  email: string
  onSaved: (p: Profile) => void
}) {
  const [username, setUsername] = useState(profile.username)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio)
  const [pending, setPending] = useState<{ blob: Blob; ext: 'webp' | 'jpg'; preview: string } | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [reset, setReset] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [resetError, setResetError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (pending) URL.revokeObjectURL(pending.preview)
    }
  }, [pending])

  const hasPicture = !!pending || (!removeAvatar && !!profile.avatar_path)
  const dirty =
    username.trim().toLowerCase() !== profile.username ||
    displayName.trim() !== profile.display_name ||
    bio.trim() !== profile.bio ||
    !!pending ||
    removeAvatar

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setInfo('')
    try {
      const { blob, ext } = await makeAvatarBlob(file)
      setPending({ blob, ext, preview: URL.createObjectURL(blob) })
      setRemoveAvatar(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that image.')
    }
  }

  function revert() {
    setUsername(profile.username)
    setDisplayName(profile.display_name)
    setBio(profile.bio)
    setPending(null)
    setRemoveAvatar(false)
    setError('')
    setInfo('')
  }

  async function save() {
    setError('')
    setInfo('')
    const uname = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{2,32}$/.test(uname)) {
      setError('Username must be 2-32 characters: letters, numbers, or underscores.')
      return
    }
    if (!displayName.trim()) {
      setError('Please enter a display name.')
      return
    }
    setBusy(true)

    const oldPath = profile.avatar_path
    let uploaded: string | null = null
    const row: Record<string, unknown> = {
      id: profile.id,
      username: uname,
      display_name: displayName.trim(),
      bio: bio.trim(),
    }

    if (pending) {
      const path = `${profile.id}/${Date.now()}.${pending.ext}`
      const up = await supabase.storage
        .from('avatars')
        .upload(path, pending.blob, { contentType: pending.blob.type, cacheControl: '31536000' })
      if (up.error) {
        setBusy(false)
        setError(`Could not upload your picture: ${up.error.message}`)
        return
      }
      uploaded = path
      row.avatar_path = path
    } else if (removeAvatar) {
      row.avatar_path = null
    }

    const { data, error } = await supabase.from('profiles').upsert(row).select().single()
    if (error) {
      if (uploaded) await supabase.storage.from('avatars').remove([uploaded])
      setBusy(false)
      setError(error.code === '23505' ? 'That username is already taken.' : error.message)
      return
    }
    if (oldPath && (uploaded || removeAvatar)) await supabase.storage.from('avatars').remove([oldPath])

    setBusy(false)
    setPending(null)
    setRemoveAvatar(false)
    setUsername(uname)
    setInfo('Changes saved.')
    onSaved(data as Profile)
  }

  async function sendReset() {
    setResetError('')
    setReset('busy')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) {
      setResetError(error.message)
      setReset('idle')
    } else {
      setReset('sent')
    }
  }

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-xl bg-[#232428]">
        <div className="h-24 bg-indigo-500" />
        <div className="flex items-end gap-4 px-5 pb-5">
          <div className="-mt-10 shrink-0">
            {pending ? (
              <img src={pending.preview} alt="" className="h-20 w-20 rounded-full border-[6px] border-[#232428] object-cover" />
            ) : (
              <Avatar
                id={profile.id}
                name={displayName.trim() || profile.display_name}
                path={removeAvatar ? null : profile.avatar_path}
                size={80}
                className="border-[6px] border-[#232428]"
              />
            )}
          </div>
          <div className="min-w-0 pt-3 leading-tight">
            <div className="truncate text-xl font-bold text-white">{displayName.trim() || profile.display_name}</div>
            <div className="truncate text-sm text-gray-400">@{username.trim().toLowerCase() || profile.username}</div>
          </div>
        </div>
      </section>

      <section className={card}>
        <h3 className={heading}>Profile picture</h3>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
        <div className="mb-5 flex gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            {hasPicture ? 'Change picture' : 'Upload picture'}
          </button>
          {hasPicture && (
            <button
              onClick={() => {
                setPending(null)
                if (profile.avatar_path) setRemoveAvatar(true)
              }}
              className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Remove
            </button>
          )}
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className={heading}>Display name</span>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} className={input} />
          </label>
          <label className="block">
            <span className={heading}>Username</span>
            <input value={username} onChange={e => setUsername(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className={heading}>About me</span>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={190}
              rows={4}
              className={`${input} resize-none`}
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {info && <p className="mt-4 text-sm text-green-400">{info}</p>}

        <div className="mt-5 flex items-center justify-end gap-3">
          {dirty && (
            <button onClick={revert} className="px-4 py-2 text-sm hover:underline">
              Reset
            </button>
          )}
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-md bg-green-600 px-6 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </section>

      <section className={card}>
        <h3 className={heading}>Password and email</h3>
        <p className="mb-4 text-sm text-gray-400">
          Signed in as <span className="text-gray-100">{email}</span>. To change your password, we email you a link
          first.
        </p>
        {resetError && <p className="mb-3 text-sm text-red-400">{resetError}</p>}
        {reset === 'sent' ? (
          <p className="text-sm text-green-400">Email sent. Check your inbox (and spam).</p>
        ) : (
          <button
            onClick={sendReset}
            disabled={reset === 'busy'}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {reset === 'busy' ? 'Sending...' : 'Email me a reset link'}
          </button>
        )}
      </section>
    </>
  )
}

/* ---------------- Appearance ---------------- */

function AppearanceTab() {
  const s = useSettings()

  return (
    <>
      <section className={card}>
        <h3 className={heading}>Theme</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => updateSettings({ theme: t.id })}
              className={`rounded-lg p-2 text-left ${s.theme === t.id ? 'ring-2 ring-indigo-400' : 'ring-1 ring-white/10 hover:ring-white/30'}`}
            >
              <div className="mb-2 flex h-14 overflow-hidden rounded-md">
                {t.swatch.map(c => (
                  <div key={c} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div className="px-1 pb-1 text-sm font-medium text-white">{t.label}</div>
            </button>
          ))}
        </div>
      </section>

      <section className={card}>
        <h3 className={heading}>Accent color</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => updateSettings({ accent: '' })}
            title="Default"
            className={`h-10 w-10 rounded-full ${!s.accent ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2b2d31]' : ''}`}
            style={{ background: DEFAULT_ACCENT_PREVIEW }}
          />
          {ACCENTS.map(c => (
            <button
              key={c}
              onClick={() => updateSettings({ accent: c })}
              className={`h-10 w-10 rounded-full ${s.accent === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2b2d31]' : ''}`}
              style={{ background: c }}
            />
          ))}
          <label className="flex items-center gap-2 pl-2 text-sm text-gray-300">
            Custom
            <input
              type="color"
              value={s.accent || DEFAULT_ACCENT_PREVIEW}
              onChange={e => updateSettings({ accent: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded bg-transparent"
            />
          </label>
        </div>
      </section>

      <section className={card}>
        <h3 className={heading}>Message display</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ['cozy', 'Cozy', 'Profile pictures and roomy spacing.'],
              ['compact', 'Compact', 'No pictures, more messages on screen.'],
            ] as const
          ).map(([id, label, desc]) => (
            <button
              key={id}
              onClick={() => updateSettings({ messageStyle: id })}
              className={`rounded-lg p-4 text-left ${
                s.messageStyle === id ? 'ring-2 ring-indigo-400' : 'ring-1 ring-white/10 hover:ring-white/30'
              }`}
            >
              <div className="font-semibold text-white">{label}</div>
              <div className="text-sm text-gray-400">{desc}</div>
            </button>
          ))}
        </div>

        <h3 className={`${heading} mt-6`}>Chat text size - {s.chatFont}px</h3>
        <input
          type="range"
          min={12}
          max={20}
          step={1}
          value={s.chatFont}
          onChange={e => updateSettings({ chatFont: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
        <p className="mt-3 rounded-md bg-[#1e1f22] px-4 py-3 text-gray-200" style={{ fontSize: s.chatFont }}>
          This is how your messages will look.
        </p>
      </section>

      <section className={card}>
        <Row title="Show member list" desc="The list on the right side of servers.">
          <Switch on={s.showMembers} onChange={v => updateSettings({ showMembers: v })} />
        </Row>
      </section>
    </>
  )
}

/* ---------------- Voice & Video ---------------- */

function useDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  const refresh = useCallback(async () => {
    try {
      setDevices(await navigator.mediaDevices.enumerateDevices())
    } catch {
      setDevices([])
    }
  }, [])

  useEffect(() => {
    refresh()
    const md = navigator.mediaDevices
    md?.addEventListener?.('devicechange', refresh)
    return () => md?.removeEventListener?.('devicechange', refresh)
  }, [refresh])

  return { devices, refresh }
}

function DeviceSelect({
  label,
  kind,
  value,
  devices,
  disabled,
  onChange,
}: {
  label: string
  kind: MediaDeviceKind
  value: string
  devices: MediaDeviceInfo[]
  disabled?: boolean
  onChange: (id: string) => void
}) {
  const list = devices.filter(d => d.kind === kind && d.deviceId && d.deviceId !== 'default')
  return (
    <label className="block">
      <span className={heading}>{label}</span>
      <select
        value={list.some(d => d.deviceId === value) ? value : ''}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className={`${input} disabled:opacity-50`}
      >
        <option value="">Default</option>
        {list.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}

function CameraPreview({ deviceId }: { deviceId: string }) {
  const [on, setOn] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!on) return
    if (!navigator.mediaDevices) {
      setError('Your browser cannot open the camera here.')
      setOn(false)
      return
    }
    let stream: MediaStream | null = null
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: deviceId ? { deviceId: { ideal: deviceId } } : true })
      .then(s => {
        if (cancelled) {
          s.getTracks().forEach(t => t.stop())
          return
        }
        stream = s
        if (ref.current) ref.current.srcObject = s
      })
      .catch(() => {
        setError('Could not open the camera. Check that it is connected and allowed for this site.')
        setOn(false)
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [on, deviceId])

  return (
    <div>
      <div className="mb-3 aspect-video max-w-md overflow-hidden rounded-xl bg-[#1e1f22]">
        {on ? (
          <video ref={ref} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">Camera preview is off</div>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <button
        onClick={() => {
          setError('')
          setOn(o => !o)
        }}
        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
      >
        {on ? 'Stop test' : 'Test video'}
      </button>
    </div>
  )
}

function VoiceTab({ voice }: { voice: VoiceApi }) {
  const s = useSettings()
  const { devices, refresh } = useDevices()
  const hasLabels = devices.some(d => d.label)
  const canPickSpeaker = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype

  async function allow() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      st.getTracks().forEach(t => t.stop())
    } catch {
      try {
        const st = await navigator.mediaDevices.getUserMedia({ audio: true })
        st.getTracks().forEach(t => t.stop())
      } catch {
        /* permission was denied */
      }
    }
    await refresh()
  }

  const pick = (kind: MediaDeviceKind, key: 'micId' | 'cameraId' | 'speakerId') => (id: string) => {
    updateSettings({ [key]: id } as Partial<Settings>)
    if (id) void voice.setDevice(kind, id)
  }

  return (
    <>
      {!hasLabels && (
        <section className={`${card} flex items-center gap-4`}>
          <p className="flex-1 text-sm text-gray-300">
            Allow access to your microphone and camera so your devices can be listed by name.
          </p>
          <button
            onClick={allow}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Allow access
          </button>
        </section>
      )}

      <section className={card}>
        <div className="grid gap-5 md:grid-cols-2">
          <DeviceSelect
            label="Microphone"
            kind="audioinput"
            value={s.micId}
            devices={devices}
            onChange={pick('audioinput', 'micId')}
          />
          <DeviceSelect
            label="Speakers"
            kind="audiooutput"
            value={s.speakerId}
            devices={devices}
            disabled={!canPickSpeaker}
            onChange={pick('audiooutput', 'speakerId')}
          />
        </div>
        {!canPickSpeaker && (
          <p className="mt-3 text-xs text-gray-400">
            Choosing speakers works in Chrome, Edge, and the desktop app. Your browser uses the system default.
          </p>
        )}
        <p className="mt-3 text-xs text-gray-400">Changes apply right away, even during a call.</p>
      </section>

      <section className={card}>
        <div className="mb-5 max-w-md">
          <DeviceSelect
            label="Camera"
            kind="videoinput"
            value={s.cameraId}
            devices={devices}
            onChange={pick('videoinput', 'cameraId')}
          />
        </div>
        <CameraPreview deviceId={s.cameraId} />
      </section>
    </>
  )
}

/* ---------------- Sounds ---------------- */

const TESTS: { label: string; name: SoundName }[] = [
  { label: 'New message', name: 'message' },
  { label: 'Direct message', name: 'dm' },
  { label: 'Friend request', name: 'friend' },
  { label: 'Someone joined', name: 'join' },
  { label: 'Someone left', name: 'leave' },
  { label: 'Mute', name: 'mute' },
]

function SoundsTab() {
  const [on, setOn] = useState(getSoundsEnabled)
  const [vol, setVol] = useState(getVolume)

  return (
    <>
      <section className={card}>
        <Row title="Enable sounds" desc="Message pings, voice join and leave, mute clicks, and friend requests.">
          <Switch
            on={on}
            onChange={v => {
              setOn(v)
              setSoundsEnabled(v)
            }}
          />
        </Row>
        <div className={`pt-3 ${on ? '' : 'opacity-40'}`}>
          <h3 className={heading}>Volume - {Math.round(vol * 100)}%</h3>
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
        </div>
      </section>

      <section className={card}>
        <h3 className={heading}>Try them out</h3>
        <div className="flex flex-wrap gap-2">
          {TESTS.map(t => (
            <button
              key={t.name}
              onClick={() => playSound(t.name)}
              disabled={!on}
              className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-40"
            >
              ▶ {t.label}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

/* ---------------- The settings screen ---------------- */

type Props = {
  profile: Profile
  email: string
  voice: VoiceApi
  onClose: () => void
  onSaved: (p: Profile) => void
  onSignOut: () => void
}

export default function UserSettings({ profile, email, voice, onClose, onSaved, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>('account')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#313338] text-gray-100 md:flex-row">
      <div className="flex shrink-0 items-center gap-2 bg-[#2b2d31] px-4 py-3 md:hidden">
        <span className="min-w-0 flex-1 truncate font-bold">User settings</span>
        <button onClick={onClose} title="Close" className="rounded-full px-3 py-1 text-xl hover:bg-white/10">
          ✕
        </button>
      </div>

      <nav className="flex shrink-0 gap-1 overflow-x-auto bg-[#2b2d31] px-3 pb-3 md:w-64 md:flex-col md:gap-0.5 md:overflow-y-auto md:px-4 md:py-14">
        {NAV.map(g => (
          <div key={g.group} className="flex gap-1 md:flex-col md:gap-0.5">
            <div className="hidden px-3 pb-2 pt-4 text-xs font-bold uppercase tracking-wide text-gray-400 md:block">
              {g.group}
            </div>
            {g.items.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-[15px] font-medium ${
                  tab === t.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <span className="w-5 text-center">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        ))}
        <div className="flex md:mt-4 md:flex-col md:border-t md:border-white/10 md:pt-4">
          <button
            onClick={onSignOut}
            className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-[15px] font-medium text-red-400 hover:bg-red-500/10"
          >
            <span className="w-5 text-center">⎋</span>
            Log Out
          </button>
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-10 md:py-14">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">{TITLES[tab]}</h1>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="hidden flex-col items-center gap-0.5 text-gray-400 hover:text-white md:flex"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-current text-lg">
                ✕
              </span>
              <span className="text-[11px] font-bold">ESC</span>
            </button>
          </div>

          {tab === 'account' && <AccountTab profile={profile} email={email} onSaved={onSaved} />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'voice' && <VoiceTab voice={voice} />}
          {tab === 'sounds' && <SoundsTab />}
          {tab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  )
}