import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { Ban, Member, Role, Server } from '../types'
import { rank, roleLabel, roleStyle } from '../roles'
import { colorFor } from '../colors'

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

export default function ServerSettings({ server, myRole, members, myId, onClose, onChanged, onLeft }: Props) {
  const myRank = rank[myRole]
  const isMod = myRank >= 2
  const isAdmin = myRank >= 3
  const isOwner = myRank === 4

  const tabs: { id: Tab; label: string }[] = [{ id: 'overview', label: 'Overview' }]
  if (isMod) tabs.push({ id: 'members', label: 'Members' })
  if (isAdmin) tabs.push({ id: 'channels', label: 'Channels' }, { id: 'bans', label: 'Bans' })

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

  const btn = 'rounded px-2 py-1 text-xs disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg bg-[#313338] text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/30 px-5 py-3">
          <h2 className="truncate text-lg font-bold">{server.name} settings</h2>
          <button onClick={onClose} title="Close" className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex gap-2 border-b border-black/30 px-5 py-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setError('')
                setInfo('')
              }}
              className={`rounded px-3 py-1 text-sm font-semibold ${
                tab === t.id ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-400">{info}</p>}

          {tab === 'overview' && (
            <>
              {isAdmin && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Server name</h3>
                  <div className="flex gap-2">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      maxLength={50}
                      className="flex-1 rounded bg-[#1e1f22] px-3 py-2 outline-none"
                    />
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(supabase.rpc('update_server', { sid: server.id, new_name: name }), () => {
                          setInfo('Name updated.')
                          onChanged()
                        })
                      }
                      className="rounded bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-600 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Invite code</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-[#1e1f22] px-3 py-2">{server.invite_code}</code>
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
                      className={`${btn} bg-white/10 hover:bg-white/20 py-2`}
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                {!isOwner && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Leave "${server.name}"?`)) return
                      run(supabase.rpc('leave_server', { sid: server.id }), onLeft)
                    }}
                    className="rounded bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50"
                  >
                    Leave server
                  </button>
                )}
                {isOwner && (
                  <>
                    <p className="text-xs text-gray-400">
                      To leave, first make someone else the owner from the Members tab.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Delete "${server.name}" and ALL its messages? This cannot be undone.`)) return
                        run(supabase.rpc('delete_server', { sid: server.id }), onLeft)
                      }}
                      className="rounded bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50"
                    >
                      Delete server
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {tab === 'members' && (
            <div className="space-y-1">
              {members.map(m => {
                const targetRank = rank[m.role]
                const isMe = m.id === myId
                const canChangeRole = isAdmin && !isMe && m.role !== 'owner' && (isOwner || targetRank < 3)
                const canKick = isMod && !isMe && myRank > targetRank
                const canBan = isAdmin && !isMe && myRank > targetRank
                const canTransfer = isOwner && !isMe

                return (
                  <div key={m.id} className="flex flex-wrap items-center gap-3 rounded px-2 py-2 hover:bg-white/5">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${colorFor(m.id)}`}
                    >
                      {m.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-sm">
                        {m.display_name}
                        {roleLabel[m.role] && (
                          <span className={`ml-1 text-xs ${roleStyle[m.role]}`}>({roleLabel[m.role]})</span>
                        )}
                        {isMe && <span className="ml-1 text-xs text-gray-500">(you)</span>}
                      </div>
                      <div className="truncate text-xs text-gray-400">@{m.username}</div>
                    </div>

                    {canChangeRole && (
                      <select
                        value={m.role}
                        disabled={busy}
                        onChange={e =>
                          run(
                            supabase.rpc('set_member_role', { sid: server.id, target: m.id, new_role: e.target.value }),
                            onChanged
                          )
                        }
                        className="rounded bg-[#1e1f22] px-2 py-1 text-xs outline-none"
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
                        className={`${btn} bg-white/10 hover:bg-white/20`}
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
                        className={`${btn} bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white`}
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
                )
              })}
            </div>
          )}

          {tab === 'channels' && (
            <div className="space-y-1">
              {server.channels.map(c => (
                <div key={c.id} className="flex items-center gap-2 rounded px-2 py-2 hover:bg-white/5">
                  <span className="flex-1 truncate"># {c.name}</span>
                  <button
                    disabled={busy}
                    onClick={() => {
                      const n = window.prompt('New channel name', c.name)
                      if (n) run(supabase.rpc('rename_channel', { cid: c.id, new_name: n }), onChanged)
                    }}
                    className={`${btn} bg-white/10 hover:bg-white/20`}
                  >
                    Rename
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Delete #${c.name} and all its messages?`)) return
                      run(supabase.rpc('delete_channel', { cid: c.id }), onChanged)
                    }}
                    className={`${btn} bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white`}
                  >
                    Delete
                  </button>
                </div>
              ))}
              <p className="pt-2 text-xs text-gray-400">Use the + next to "Text channels" to create new ones.</p>
            </div>
          )}

          {tab === 'bans' && (
            <div className="space-y-1">
              {bans.length === 0 && <p className="text-sm text-gray-400">No one is banned.</p>}
              {bans.map(b => (
                <div key={b.user_id} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-white/5">
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm">{b.display_name}</div>
                    <div className="truncate text-xs text-gray-400">@{b.username}</div>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(supabase.rpc('unban_member', { sid: server.id, target: b.user_id }), () =>
                        setBans(prev => prev.filter(x => x.user_id !== b.user_id))
                      )
                    }
                    className={`${btn} bg-white/10 hover:bg-white/20`}
                  >
                    Unban
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}