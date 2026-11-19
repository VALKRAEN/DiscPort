import { useEffect } from 'react'
import type { Member } from '../types'
import { colorFor } from '../colors'

type Props = {
  member: Member
  online: boolean
  onClose: () => void
}

export default function ProfileCard({ member, online, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
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
            <span
              className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[#232428] ${
                online ? 'bg-green-500' : 'bg-gray-500'
              }`}
            />
          </div>

          <div className="rounded-lg bg-[#111214] p-4 space-y-3">
            <div>
              <div className="text-xl font-bold">
                {member.display_name}
                {member.role === 'owner' && <span className="ml-2 text-xs text-amber-400">(owner)</span>}
              </div>
              <div className="text-sm text-gray-400">@{member.username}</div>
              <div className="mt-1 text-xs text-gray-400">{online ? 'Online' : 'Offline'}</div>
            </div>

            <div className="border-t border-white/10 pt-3">
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">About me</h3>
              <p className="whitespace-pre-wrap break-words text-sm">
                {member.bio || <span className="text-gray-500">No bio yet.</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}