import { useState } from 'react'
import type { ReactNode } from 'react'
import type { BlockedUser, FriendRow } from '../useFriends'
import Avatar from './Avatar'

type Tab = 'all' | 'pending' | 'add' | 'blocked'

type Props = {
  friends: FriendRow[]
  incoming: FriendRow[]
  outgoing: FriendRow[]
  blocks: BlockedUser[]
  onAdd: (username: string) => Promise<string | null>
  onAccept: (friendshipId: number) => Promise<string | null>
  onRemove: (friendshipId: number) => Promise<string | null>
  onMessage: (userId: string) => Promise<string | null>
  onBlock: (userId: string) => Promise<string | null>
  onUnblock: (userId: string) => Promise<string | null>
  onOpenNav: () => void
  navBadge: number
}

function Row({
  id,
  name,
  username,
  avatar,
  children,
}: {
  id: string
  name: string
  username: string
  avatar?: string | null
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded px-2 py-2 hover:bg-white/5">
      <Avatar id={id} name={name} path={avatar} size={40} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate">{name}</div>
        <div className="truncate text-xs text-gray-400">@{username}</div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export default function FriendsPanel({
  friends,
  incoming,
  outgoing,
  blocks,
  onAdd,
  onAccept,
  onRemove,
  onMessage,
  onBlock,
  onUnblock,
  onOpenNav,
  navBadge,
}: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<string | null>, ok = ''): Promise<boolean> {
    setError('')
    setInfo('')
    setBusy(true)
    const err = await fn()
    setBusy(false)
    if (err) setError(err)
    else if (ok) setInfo(ok)
    return !err
  }

  const btn = 'rounded px-3 py-2 text-sm disabled:opacity-50 md:px-2 md:py-1 md:text-xs'
  const neutral = `${btn} bg-white/10 hover:bg-white/20`
  const danger = `${btn} bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white`
  const primary = `${btn} bg-indigo-500 hover:bg-indigo-600`

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: `Friends${friends.length ? ` (${friends.length})` : ''}` },
    { id: 'pending', label: `Pending${incoming.length ? ` (${incoming.length})` : ''}` },
    { id: 'add', label: 'Add friend' },
    { id: 'blocked', label: 'Blocked' },
  ]

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-black/20 px-2 font-semibold md:px-4">
        <button
          onClick={onOpenNav}
          title="Menu"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded text-xl hover:bg-white/10 md:hidden"
        >
          ☰
          {navBadge > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
        </button>
        <span>Friends</span>
      </header>

      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-black/20 px-3 py-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              setError('')
              setInfo('')
            }}
            className={`shrink-0 whitespace-nowrap rounded px-3 py-2 text-sm font-semibold md:py-1 ${
              tab === t.id ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {error && <p className="pb-2 text-sm text-red-400">{error}</p>}
        {info && <p className="pb-2 text-sm text-green-400">{info}</p>}

        {tab === 'all' && (
          <>
            {friends.length === 0 && (
              <p className="text-sm text-gray-400">
                No friends yet. Use the Add friend tab, or open someone's profile in a server.
              </p>
            )}
            {friends.map(f => (
              <Row
                key={f.friendship_id}
                id={f.other_id}
                name={f.other_display_name}
                username={f.other_username}
                avatar={f.other_avatar_path}
              >
                <button disabled={busy} onClick={() => run(() => onMessage(f.other_id))} className={primary}>
                  Message
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Remove ${f.other_display_name} from your friends?`))
                      run(() => onRemove(f.friendship_id))
                  }}
                  className={neutral}
                >
                  Remove
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Block ${f.other_display_name}? They won't be able to message you.`))
                      run(() => onBlock(f.other_id))
                  }}
                  className={danger}
                >
                  Block
                </button>
              </Row>
            ))}
          </>
        )}

        {tab === 'pending' && (
          <>
            {incoming.length === 0 && outgoing.length === 0 && (
              <p className="text-sm text-gray-400">No pending requests.</p>
            )}
            {incoming.length > 0 && (
              <h3 className="px-2 pt-1 text-xs font-semibold uppercase text-gray-400">
                Received - {incoming.length}
              </h3>
            )}
            {incoming.map(f => (
              <Row
                key={f.friendship_id}
                id={f.other_id}
                name={f.other_display_name}
                username={f.other_username}
                avatar={f.other_avatar_path}
              >
                <button disabled={busy} onClick={() => run(() => onAccept(f.friendship_id))} className={primary}>
                  Accept
                </button>
                <button disabled={busy} onClick={() => run(() => onRemove(f.friendship_id))} className={neutral}>
                  Decline
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Block ${f.other_display_name}?`)) run(() => onBlock(f.other_id))
                  }}
                  className={danger}
                >
                  Block
                </button>
              </Row>
            ))}
            {outgoing.length > 0 && (
              <h3 className="px-2 pt-3 text-xs font-semibold uppercase text-gray-400">Sent - {outgoing.length}</h3>
            )}
            {outgoing.map(f => (
              <Row
                key={f.friendship_id}
                id={f.other_id}
                name={f.other_display_name}
                username={f.other_username}
                avatar={f.other_avatar_path}
              >
                <button disabled={busy} onClick={() => run(() => onRemove(f.friendship_id))} className={neutral}>
                  Cancel
                </button>
              </Row>
            ))}
          </>
        )}

        {tab === 'add' && (
          <div className="max-w-md space-y-3">
            <p className="text-sm text-gray-400">
              Enter their exact username. If they already sent you a request, you become friends right away.
            </p>
            <div className="flex gap-2">
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && username.trim()) {
                    const name = username.trim().replace(/^@/, '')
                    if (await run(() => onAdd(name), `Request sent to @${name}.`)) setUsername('')
                  }
                }}
                placeholder="username"
                className="min-w-0 flex-1 rounded bg-[#1e1f22] px-3 py-2 outline-none"
              />
              <button
                disabled={busy || !username.trim()}
                onClick={async () => {
                  const name = username.trim().replace(/^@/, '')
                  if (await run(() => onAdd(name), `Request sent to @${name}.`)) setUsername('')
                }}
                className="rounded bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {tab === 'blocked' && (
          <>
            {blocks.length === 0 && <p className="text-sm text-gray-400">You haven't blocked anyone.</p>}
            {blocks.map(b => (
              <Row key={b.user_id} id={b.user_id} name={b.display_name} username={b.username} avatar={b.avatar_path}>
                <button disabled={busy} onClick={() => run(() => onUnblock(b.user_id), 'Unblocked.')} className={neutral}>
                  Unblock
                </button>
              </Row>
            ))}
          </>
        )}
      </div>
    </main>
  )
}