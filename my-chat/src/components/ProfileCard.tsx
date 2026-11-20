import { useEffect, useState } from 'react'
import type { Member } from '../types'
import { colorFor } from '../colors'
import { roleLabel, roleStyle } from '../roles'

type Props = {
  member: Member
  online?: boolean // leave out to hide the status
  onClose: () => void
  onMessage?: () => Promise<string | null>
}

export default function ProfileCard({ member, online, onClose, onMessage }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const known = online !== undefined

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function message() {
    if (!onMessage) return
    setError('')
    setBusy(true)
    const err = await onMessage()
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-lg bg-[#232428] text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className={`h-20 ${colorFor(member.id)}`} />
        <button
          onClick={onClose}
          title="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
        >
          ✕
        </button>

        <div className="px-5 pb-5">
          <div className="relative -mt-10 mb-3 w-fit">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full border-[6px] border-[#232428] text-3xl font-bold ${colorFor(member.id)}`}
            >
              {member.display_name[0]?.toUpperCase()}
            </div>
            {known && (
              <span
                className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[#232428] ${
                  online ? 'bg-green-500' : 'bg-gray-500'
                }`}
              />
            )}
          </div>

          <div className="space-y-3 rounded-lg bg-[#111214] p-4">
            <div>
              <div className="text-xl font-bold">
                {member.display_name}
                {roleLabel[member.role] && (
                  <span className={`ml-2 text-xs ${roleStyle[member.role]}`}>({roleLabel[member.role]})</span>
                )}
              </div>
              <div className="text-sm text-gray-400">@{member.username}</div>
              {known && <div className="mt-1 text-xs text-gray-400">{online ? 'Online' : 'Offline'}</div>}
            </div>

            <div className="border-t border-white/10 pt-3">
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">About me</h3>
              <p className="whitespace-pre-wrap break-words text-sm">
                {member.bio || <span className="text-gray-500">No bio yet.</span>}
              </p>
            </div>

            {onMessage && (
              <div className="border-t border-white/10 pt-3">
                <button
                  onClick={message}
                  disabled={busy}
                  className="w-full rounded bg-indigo-500 py-2 font-semibold hover:bg-indigo-600 disabled:opacity-50"
                >
                  {busy ? 'Opening...' : 'Message'}
                </button>
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}