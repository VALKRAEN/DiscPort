import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { Ban, Member, Role, Server } from '../types'
import { rank, roleLabel, roleStyle } from '../roles'
import Avatar from './Avatar'

type Props = {
  server: Server
  myRole: Role
  members: Member[]
  myId: string
  onClose: () => void
  onChanged: () => void
  onLeft: () => void
}

type Tab = 'overview' | 'members' | 'channels' | 'bans'
type Result = PromiseLike<{ error: { message: string } | null }>

const titles: Record<Tab, string> = {
  overview: 'Server overview',
  members: 'Members',
  channels: 'Channels',
  bans: 'Bans',
}

export default function ServerSettings({ server, myRole, members, myId, onClose, onChanged, onLeft }: Props) {
  const myRank = rank[myRole]
  const isMod = myRank >= 2
  const isAdmin = myRank >= 3
  const isOwner = myRank === 4

  const tabs: { id: Tab; label: string; icon: string }[] = [{ id: 'overview', label: 'Overview', icon: '⚙' }]
  if (isMod) tabs.push({ id: 'members', label: 'Members', icon: '👥' })
  if (isAdmin) tabs.push({ id: 'channels', label: 'Channels', icon: '#' }, { id: 'bans', label: 'Bans', icon: '⛔' })

  const [tab, setTab] = useState<Tab>('overview')
  const [name, setName] = useState(server.name)
  const [bans, setBans] = useState<Ban[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (tab !== 'bans' || !isAdmin) return
    supabase
      .from('server_bans')
      .select('user_id, username, display_name, created_at')
      .eq('server_id', server.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setBans((data ?? []) as Ban[])
      })
  }, [tab, isAdmin, server.id])

  async function run(call: Result, after?: () => void) {
    setError('')
    setInfo('')
    setBusy(true)
    const { error } = await call
    setBusy(false)
    if (error) {
      setError(error.message)
      return false
    }
    after?.()
    return true
  }

  const btn = 'rounded-md px-3.5 py-2 text-sm font-medium disabled:opacity-50'
  const neutral = `${btn} bg-white/10 hover:bg-white/20`
  const danger = `${btn} bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white`
  const label = 'mb-2 block text-xs font-bold uppercase tracking-wide text-gray-300'
  const card = 'mb-6 rounded-xl bg-[#2b2d31] p-5'

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#313338] text-gray-100 md:flex-row">
      {/* Phone: a slim top bar */}
      <div className="flex shrink-0 items-center gap-2 bg-[#2b2d31] px-4 py-3 md:hidden">
        <span className="min-w-0 flex-1 truncate font-bold">{server.name}</span>
        <button onClick={onClose} title="Close" className="rounded-full px-3 py-1 text-xl hover:bg-white/10">
          ✕
        </button>
      </div>

      {/* Menu: a row on phones, a column on larger screens */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto bg-[#2b2d31] px-3 pb-3 md:w-64 md:flex-col md:gap-0.5 md:overflow-y-auto md:px-4 md:py-14">
        <div className="hidden truncate px-3 pb-3 text-xs font-bold uppercase tracking-wide text-gray-400 md:block">
          {server.name}
        </div>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              setError('')
              setInfo('')
            }}
            className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-[15px] font-medium ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <span className="w-5 text-center">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-10 md:py-14">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">{titles[tab]}</h1>
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

          {error && <p className="mb-4 rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
          {info && <p className="mb-4 rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-400">{info}</p>}

          {tab === 'overview' && (
            <>
              <section className={card}>
                <h3 className={label}>Server name</h3>
                {isAdmin ? (
                  <div className="flex gap-3">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      maxLength={50}
                      className="min-w-0 flex-1 rounded-md bg-[#1e1f22] px-3 py-3 outline-none"
                    />
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(supabase.rpc('update_server', { sid: server.id, new_name: name }), () => {
                          setInfo('Name updated.')
                          onChanged()
                        })
                      }
                      className="rounded-md bg-indigo-500 px-5 py-3 font-medium hover:bg-indigo-600 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-white">{server.name}</p>
                )}
              </section>

              <section className={card}>
                <h3 className={label}>Invite code</h3>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded-md bg-[#1e1f22] px-3 py-3 font-mono">{server.invite_code}</code>
                  {isAdmin && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm('Generate a new code? The old one will stop working.')) return
                        run(supabase.rpc('regenerate_invite', { sid: server.id }), () => {
                          setInfo('New invite code created.')
                          onChanged()
                        })
                      }}
                      className={`${neutral} py-3`}
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </section>

              <section className={`${card} border border-red-500/30`}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-red-400">Danger zone</h3>
                {!isOwner && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Leave "${server.name}"?`)) return
                      run(supabase.rpc('leave_server', { sid: server.id }), onLeft)
                    }}
                    className={danger}
                  >
                    Leave server
                  </button>
                )}
                {isOwner && (
                  <>
                    <p className="mb-3 text-sm text-gray-400">
                      To leave, first make someone else the owner from the Members tab.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Delete "${server.name}" and ALL its messages? This cannot be undone.`)) return
                        run(supabase.rpc('delete_server', { sid: server.id }), onLeft)
                      }}
                      className={danger}
                    >
                      Delete server
                    </button>
                  </>
                )}
              </section>
            </>
          )}

          {tab === 'members' && (
            <section className="rounded-xl bg-[#2b2d31] p-2">
              {members.map(m => {
                const targetRank = rank[m.role]
                const isMe = m.id === myId
                const canChangeRole = isAdmin && !isMe && m.role !== 'owner' && (isOwner || targetRank < 3)
                const canKick = isMod && !isMe && myRank > targetRank
                const canBan = isAdmin && !isMe && myRank > targetRank
                const canTransfer = isOwner && !isMe

                return (
                  <div key={m.id} className="flex flex-wrap items-center gap-4 rounded-lg px-3 py-3 hover:bg-white/5">
                    <Avatar id={m.id} name={m.display_name} path={m.avatar_path} size={44} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate font-medium text-white">
                        {m.display_name}
                        {roleLabel[m.role] && (
                          <span className={`ml-2 text-xs font-semibold ${roleStyle[m.role]}`}>{roleLabel[m.role]}</span>
                        )}
                        {isMe && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                      </div>
                      <div className="truncate text-sm text-gray-400">@{m.username}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canChangeRole && (
                        <select
                          value={m.role}
                          disabled={busy}
                          onChange={e =>
                            run(
                              supabase.rpc('set_member_role', {
                                sid: server.id,
                                target: m.id,
                                new_role: e.target.value,
                              }),
                              onChanged
                            )
                          }
                          className="rounded-md bg-[#1e1f22] px-3 py-2 text-base outline-none md:text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          {isOwner && <option value="admin">Admin</option>}
                        </select>
                      )}
                      {canKick && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Kick ${m.display_name}? They can rejoin with the invite code.`)) return
                            run(supabase.rpc('kick_member', { sid: server.id, target: m.id }), onChanged)
                          }}
                          className={neutral}
                        >
                          Kick
                        </button>
                      )}
                      {canBan && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Ban ${m.display_name}? They won't be able to rejoin.`)) return
                            run(supabase.rpc('ban_member', { sid: server.id, target: m.id }), onChanged)
                          }}
                          className={danger}
                        >
                          Ban
                        </button>
                      )}
                      {canTransfer && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Make ${m.display_name} the owner? You will become an admin.`)) return
                            run(supabase.rpc('transfer_ownership', { sid: server.id, target: m.id }), onChanged)
                          }}
                          className={`${btn} bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white`}
                        >
                          Make owner
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {tab === 'channels' && (
            <>
              <section className="rounded-xl bg-[#2b2d31] p-2">
                {server.channels.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/5">
                    <span className="w-6 text-center text-xl text-gray-400">{c.kind === 'voice' ? '🔊' : '#'}</span>
                    <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-white">{c.name}</span>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const n = window.prompt('New channel name', c.name)
                        if (n) run(supabase.rpc('rename_channel', { cid: c.id, new_name: n }), onChanged)
                      }}
                      className={neutral}
                    >
                      Rename
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Delete #${c.name} and all its messages?`)) return
                        run(supabase.rpc('delete_channel', { cid: c.id }), onChanged)
                      }}
                      className={danger}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </section>
              <p className="mt-4 text-sm text-gray-400">Use the + next to "Text channels" to create new ones.</p>
            </>
          )}

          {tab === 'bans' && (
            <section className="rounded-xl bg-[#2b2d31] p-2">
              {bans.length === 0 && <p className="px-3 py-6 text-center text-gray-400">No one is banned.</p>}
              {bans.map(b => (
                <div key={b.user_id} className="flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-white/5">
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate font-medium text-white">{b.display_name}</div>
                    <div className="truncate text-sm text-gray-400">@{b.username}</div>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(supabase.rpc('unban_member', { sid: server.id, target: b.user_id }), () =>
                        setBans(prev => prev.filter(x => x.user_id !== b.user_id))
                      )
                    }
                    className={neutral}
                  >
                    Unban
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}