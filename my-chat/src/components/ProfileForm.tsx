import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { supabase } from '../supabase'
import type { Profile } from '../types'
import Avatar from './Avatar'
import { makeAvatarBlob } from '../avatars'

type Props = {
  userId: string
  initial?: Profile
  onSaved: (p: Profile) => void
  onCancel?: () => void
  onChangePassword?: () => void
}

type Pending = { blob: Blob; ext: 'webp' | 'jpg'; preview: string }

export default function ProfileForm({ userId, initial, onSaved, onCancel, onChangePassword }: Props) {
  const [username, setUsername] = useState(initial?.username ?? '')
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [pending, setPending] = useState<Pending | null>(null) // a new picture, uploaded on Save
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (pending) URL.revokeObjectURL(pending.preview)
    }
  }, [pending])

  const hasPicture = !!pending || (!removeAvatar && !!initial?.avatar_path)

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const { blob, ext } = await makeAvatarBlob(file)
      setPending({ blob, ext, preview: URL.createObjectURL(blob) })
      setRemoveAvatar(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that image.')
    }
  }

  function removePicture() {
    setPending(null)
    if (initial?.avatar_path) setRemoveAvatar(true)
  }

  async function save() {
    setError('')
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

    const oldPath = initial?.avatar_path ?? null
    let uploadedPath: string | null = null
    const row: Record<string, unknown> = {
      id: userId,
      username: uname,
      display_name: displayName.trim(),
      bio: bio.trim(),
    }

    if (pending) {
      const path = `${userId}/${Date.now()}.${pending.ext}`
      const up = await supabase.storage
        .from('avatars')
        .upload(path, pending.blob, { contentType: pending.blob.type, cacheControl: '31536000' })
      if (up.error) {
        setBusy(false)
        setError(`Could not upload your picture: ${up.error.message}`)
        return
      }
      uploadedPath = path
      row.avatar_path = path
    } else if (removeAvatar) {
      row.avatar_path = null
    }

    const { data, error } = await supabase.from('profiles').upsert(row).select().single()
    if (error) {
      // Don't leave an unused file behind if the profile didn't save
      if (uploadedPath) await supabase.storage.from('avatars').remove([uploadedPath])
      setBusy(false)
      setError(error.code === '23505' ? 'That username is already taken.' : error.message)
      return
    }

    // Tidy up the picture that was replaced or removed
    if (oldPath && (uploadedPath || removeAvatar)) {
      await supabase.storage.from('avatars').remove([oldPath])
    }

    setBusy(false)
    onSaved(data as Profile)
  }

  const input =
    'mt-1 w-full rounded bg-[#1e1f22] px-3 py-2 outline-none normal-case font-normal text-base text-gray-100'

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#313338] p-4 text-gray-100">
      <div className="w-full max-w-sm bg-[#2b2d31] rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">{initial ? 'Edit profile' : 'Set up your profile'}</h1>

        <div className="flex flex-col items-center gap-3">
          {pending ? (
            <img src={pending.preview} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <Avatar
              id={userId}
              name={displayName.trim() || username || '?'}
              path={removeAvatar ? null : initial?.avatar_path}
              size={96}
            />
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            >
              {hasPicture ? 'Change picture' : 'Upload picture'}
            </button>
            {hasPicture && (
              <button
                onClick={removePicture}
                className="rounded bg-red-500/20 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white"
              >
                Remove
              </button>
            )}
          </div>
          {(pending || removeAvatar) && <p className="text-xs text-gray-400">Press Save to apply this change.</p>}
        </div>

        <label className="block text-xs font-semibold uppercase text-gray-400">
          Username
          <input value={username} onChange={e => setUsername(e.target.value)} className={input} />
        </label>
        <label className="block text-xs font-semibold uppercase text-gray-400">
          Display name
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} className={input} />
        </label>
        <label className="block text-xs font-semibold uppercase text-gray-400">
          Bio
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={190}
            rows={3}
            className={`${input} resize-none`}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          {onCancel && (
            <button onClick={onCancel} className="flex-1 rounded bg-white/10 hover:bg-white/20 py-2">
              Cancel
            </button>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 py-2 font-semibold"
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
        {onChangePassword && (
          <button onClick={onChangePassword} className="w-full text-sm text-indigo-400 hover:underline">
            Change password
          </button>
        )}
      </div>
    </div>
  )
}