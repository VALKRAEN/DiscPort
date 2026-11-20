import { useEffect, useState } from 'react'
import type { Member } from '../types'
import type { FriendState } from '../useFriends'
import { colorFor } from '../colors'
import { roleLabel, roleStyle } from '../roles'
import Avatar from './Avatar'

type Act = () => Promise<string | null>

type Props = {
  member: Member
  online?: boolean // leave out to hide the status
  friendState?: FriendState
  blocked?: boolean
  onClose: () => void
  onMessage?: Act
  onAddFriend?: Act
  onBlock?: Act
  onUnblock?: Act
  onReport?: () => void
}

export default function ProfileCard({
  member,
  online,
  friendState = 'none',
  blocked = false,
  onClose,
  onMessage,
  onAddFriend,
  onBlock,
  onUnblock,
  onReport,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const known = online !== undefined
  const hasActions = onMessage || onAddFriend || onBlock || onUnblock || onReport

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function act(fn: Act | undefined, ok = '') {
    if (!fn) return
    setError('')
    setInfo('')
    setBusy(true)
    const err = await fn()
    setBusy(false)
    if (err) setError(err)
    else if (ok) setInfo(ok)
  }

  const small = 'flex-1 rounded py-2 text-sm disabled:opacity-50'

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
            <Avatar
              id={member.id}
              name={member.display_name}
              path={member.avatar_path}
              size={80}
              className="border-[6px] border-[#232428]"
            />
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

            {hasActions && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                {blocked ? (
                  onUnblock && (
                    <button
                      disabled={busy}
                      onClick={() => act(onUnblock, 'Unblocked.')}
                      className={`${small} w-full bg-white/10 hover:bg-white/20`}
                    >
                      Unblock
                    </button>
                  )
                ) : (
                  <>
                    {onMessage && (
                      <button
                        disabled={busy}
                        onClick={() => act(onMessage)}
                        className="w-full rounded bg-indigo-500 py-2 font-semibold hover:bg-indigo-600 disabled:opacity-50"
                      >
                        Message
                      </button>
                    )}
                    {onAddFriend && (friendState === 'none' || friendState === 'incoming') && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          act(
                            onAddFriend,
                            friendState === 'incoming' ? 'You are now friends.' : 'Friend request sent.'
                          )
                        }
                        className="w-full rounded bg-white/10 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
                      >
                        {friendState === 'incoming' ? 'Accept friend request' : 'Add friend'}
                      </button>
                    )}
                    {friendState === 'friend' && <p className="text-center text-sm text-green-400">✓ You are friends</p>}
                    {friendState === 'outgoing' && (
                      <p className="text-center text-sm text-gray-400">Friend request sent</p>
                    )}
                  </>
                )}

                <div className="flex gap-2">
                  {onBlock && !blocked && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Block ${member.display_name}? They won't be able to message you.`))
                          act(onBlock)
                      }}
                      className={`${small} bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white`}
                    >
                      Block
                    </button>
                  )}
                  {onReport && (
                    <button
                      disabled={busy}
                      onClick={onReport}
                      className={`${small} bg-white/10 text-gray-300 hover:bg-white/20`}
                    >
                      Report
                    </button>
                  )}
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}
                {info && <p className="text-sm text-green-400">{info}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}