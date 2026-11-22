import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { DmSummary, Profile } from '../types'
import type { VoiceApi } from '../useVoice'
import VoiceBar from './VoiceBar'
import UserPanel from './UserPanel'
import Avatar from './Avatar'

type Person = { id: string; username: string; display_name: string; avatar_path: string | null }

type Props = {
  dms: DmSummary[]
  activeId: string | null
  friendsActive: boolean
  pendingCount: number
  profile: Profile
  voice: VoiceApi
  voiceLabel: { channel: string; server: string } | null
  onSelect: (id: string) => void
  onShowFriends: () => void
  onStart: (userId: string) => Promise<string | null>
  onOpenCall: () => void
  onOpenUserSettings: () => void
}

export default function DmSidebar({
  dms,
  activeId,
  friendsActive,
  pendingCount,
  profile,
  voice,
  voiceLabel,
  onSelect,
  onShowFriends,
  onStart,
  onOpenCall,
  onOpenUserSettings,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Person[] | null>(null)
  const [error, setError] = useState('')

  // Search people you share a server with (profile rules only reveal those people)
  useEffect(() => {
    const q = query.trim().replace(/[,()%*\\"]/g, '')
    if (q.length < 2) {
      setResults(null)
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_path')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', profile.id)
        .limit(8)
      if (cancelled) return
      if (error) console.error(error)
      setResults((data ?? []) as Person[])
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, profile.id])

  async function startWith(userId: string) {
    setError('')
    const err = await onStart(userId)
    if (err) setError(err)
    else {
      setQuery('')
      setResults(null)
    }
  }

  const preview = (d: DmSummary) =>
    d.last_content ? `${d.last_user_id === profile.id ? 'You: ' : ''}${d.last_content}` : 'No messages yet'

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#2b2d31]">
      <div className="flex h-12 shrink-0 items-center px-3 shadow-[0_1px_0_rgba(0,0,0,0.25)]">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find or start a conversation"
          className="w-full rounded-md bg-[#1e1f22] px-2.5 py-1.5 text-sm outline-none placeholder:text-gray-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {error && <p className="px-2 pb-2 text-xs text-red-400">{error}</p>}

        {results !== null ? (
          <>
            <div className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-gray-400">People</div>
            {results.length === 0 && (
              <p className="px-2 py-2 text-sm text-gray-400">
                No one found. This searches people you share a server with. Use Friends to add anyone by username.
              </p>
            )}
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => startWith(p.id)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/5"
              >
                <Avatar id={p.id} name={p.display_name} path={p.avatar_path} size={32} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[15px] text-gray-100">{p.display_name}</span>
                  <span className="block truncate text-xs text-gray-400">@{p.username}</span>
                </span>
              </button>
            ))}
          </>
        ) : (
          <>
            <button
              onClick={onShowFriends}
              className={`mb-3 flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left ${
                friendsActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">👥</span>
              <span className="flex-1 text-[16px] font-medium">Friends</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 text-xs font-bold text-white">{pendingCount}</span>
              )}
            </button>

            <div className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Direct messages</div>
            {dms.length === 0 && (
              <p className="px-2 py-2 text-sm text-gray-400">
                No conversations yet. Search for someone above, or message a friend.
              </p>
            )}
            {dms.map(d => (
              <button
                key={d.conversation_id}
                onClick={() => onSelect(d.conversation_id)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${
                  d.conversation_id === activeId ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <Avatar id={d.other_id} name={d.other_display_name} path={d.other_avatar_path} size={32} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span
                    className={`block truncate text-[15px] ${d.unread ? 'font-bold text-white' : 'text-gray-300'}`}
                  >
                    {d.other_display_name}
                  </span>
                  <span className="block truncate text-xs text-gray-400">{preview(d)}</span>
                </span>
                {d.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />}
              </button>
            ))}
          </>
        )}
      </div>

      <VoiceBar
        voice={voice}
        channelName={voiceLabel?.channel ?? ''}
        serverName={voiceLabel?.server}
        onOpenCall={onOpenCall}
      />
      <UserPanel profile={profile} voice={voice} onOpenSettings={onOpenUserSettings} />
    </aside>
  )
}