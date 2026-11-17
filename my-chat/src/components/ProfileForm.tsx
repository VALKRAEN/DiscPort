import { useState } from 'react'
import { supabase } from '../supabase'
import type { Profile } from '../types'

type Props = {
  userId: string
  initial?: Profile
  onSaved: (p: Profile) => void
  onCancel?: () => void
  onChangePassword?: () => void
}

export default function ProfileForm({ userId, initial, onSaved, onCancel, onChangePassword }: Props) {
  const [username, setUsername] = useState(initial?.username ?? '')
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, username: uname, display_name: displayName.trim(), bio: bio.trim() })
      .select()
      .single()
    setBusy(false)
    if (error) {
      setError(error.code === '23505' ? 'That username is already taken.' : error.message)
      return
    }
    onSaved(data as Profile)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[#313338] text-gray-100">
      <div className="w-full max-w-sm bg-[#2b2d31] rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">
          {initial ? 'Edit profile' : 'Set up your profile'}
        </h1>
        <label className="block text-xs font-semibold uppercase text-gray-400">
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="mt-1 w-full rounded bg-[#1e1f22] px-3 py-2 outline-none normal-case font-normal text-base text-gray-100"
          />
        </label>
        <label className="block text-xs font-semibold uppercase text-gray-400">
          Display name
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={40}
            className="mt-1 w-full rounded bg-[#1e1f22] px-3 py-2 outline-none normal-case font-normal text-base text-gray-100"
          />
        </label>
        <label className="block text-xs font-semibold uppercase text-gray-400">
          Bio
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={190}
            rows={3}
            className="mt-1 w-full rounded bg-[#1e1f22] px-3 py-2 outline-none resize-none normal-case font-normal text-base text-gray-100"
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