import { useState } from 'react'
import { supabase } from '../supabase'

type Props = {
  email?: string // pass this to require the current password (change mode)
  onDone: () => void
  onCancel?: () => void
}

export default function PasswordForm({ email, onDone, onCancel }: Props) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setError('')
    if (next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (next !== confirm) {
      setError('The new passwords do not match.')
      return
    }
    setBusy(true)
    if (email) {
      const check = await supabase.auth.signInWithPassword({ email, password: current })
      if (check.error) {
        setBusy(false)
        setError('Your current password is incorrect.')
        return
      }
    }
    const result = await supabase.auth.updateUser({ password: next })
    if (result.error) {
      setBusy(false)
      setError(result.error.message)
      return
    }

    // Sign out every session for this account, on all devices, including this one
    const out = await supabase.auth.signOut({ scope: 'global' })
    setBusy(false)
    if (out.error) console.error(out.error)
    onDone()
  }

  const inputClass = 'mt-1 w-full rounded bg-[#1e1f22] px-3 py-2 outline-none normal-case font-normal text-base text-gray-100'
  const labelClass = 'block text-xs font-semibold uppercase text-gray-400'

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#313338] p-4 text-gray-100">
      <div className="w-full max-w-sm bg-[#2b2d31] rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">
          {email ? 'Change password' : 'Choose a new password'}
        </h1>
        <p className="text-xs text-gray-400 text-center">
          You'll be signed out everywhere and asked to sign in with your new password.
        </p>
        {email && (
          <label className={labelClass}>
            Current password
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className={inputClass} />
          </label>
        )}
        <label className={labelClass}>
          New password
          <input type="password" value={next} onChange={e => setNext(e.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Confirm new password
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            className={inputClass}
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
            {busy ? 'Saving...' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  )
}