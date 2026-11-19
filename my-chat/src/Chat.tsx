import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Server, Profile, Message, Member, Role } from './types'
import { rank } from './roles'
import { useVoice } from './useVoice'
import ServerRail from './components/ServerRail'
import ChannelSidebar from './components/ChannelSidebar'
import ChatArea from './components/ChatArea'
import MemberList from './components/MemberList'
import ServerModal from './components/ServerModal'
import ChannelModal from './components/ChannelModal'
import ProfileCard from './components/ProfileCard'
import ServerSettings from './components/ServerSettings'
import VoiceBar from './components/VoiceBar'

type Props = {
  profile: Profile
  onEditProfile: () => void
  onSignOut: () => void
}

export default function Chat({ profile, onEditProfile, onSignOut }: Props) {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [serverId, setServerId] = useState<string | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [voiceMap, setVoiceMap] = useState<Record<string, string[]>>({})
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [navOpen, setNavOpen] = useState(false) // mobile: servers and channels panel
  const [membersOpen, setMembersOpen] = useState(false) // mobile: members panel

  const voice = useVoice()
  const presenceRef = useRef<RealtimeChannel | null>(null)
  const onlineAtRef = useRef(new Date().toISOString())
  const voiceChannelRef = useRef<string | null>(null)
  voiceChannelRef.current = voice.channelId

  const loadServers = useCallback(async (selectServerId?: string, selectChannelId?: string) => {
    const { data, error } = await supabase
      .from('servers')
      .select('id, name, color, invite_code, channels(id, name, kind, created_at)')
      .order('created_at')
      .order('created_at', { referencedTable: 'channels' })
    if (error) console.error(error)
    setServers((data ?? []) as Server[])
    if (selectServerId) {
      setServerId(selectServerId)
      setChannelId(selectChannelId ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadServers()
  }, [loadServers])

  const server = servers.find(s => s.id === serverId) ?? servers[0] ?? null
  const textChannels = server?.channels.filter(c => c.kind === 'text') ?? []
  const channel = textChannels.find(c => c.id === channelId) ?? textChannels[0] ?? null
  const activeServerId = server?.id
  const activeChannelId = channel?.id

  const activeServerRef = useRef<string | undefined>(undefined)
  activeServerRef.current = activeServerId

  const myRole: Role = members.find(m => m.id === profile.id)?.role ?? 'member'
  const myRank = rank[myRole]
  const selectedMember = members.find(m => m.id === selectedMemberId) ?? null
  const joinedChannelName = server?.channels.find(c => c.id === voice.channelId)?.name ?? ''

  // Who is in each voice channel (from presence), with names
  const voiceOccupants: Record<string, { id: string; name: string }[]> = {}
  for (const [cid, ids] of Object.entries(voiceMap)) {
    voiceOccupants[cid] = ids.map(id => ({
      id,
      name: members.find(m => m.id === id)?.display_name ?? 'Unknown',
    }))
  }

  const loadMembers = useCallback(async (sid: string) => {
    const { data, error } = await supabase
      .from('server_members')
      .select('role, profiles(id, username, display_name, bio)')
      .eq('server_id', sid)
    if (error) console.error(error)
    if (activeServerRef.current !== sid) return
    const list = (data ?? []).flatMap((row: any) =>
      row.profiles ? [{ ...row.profiles, role: row.role } as Member] : []
    )
    list.sort((a, b) => a.display_name.localeCompare(b.display_name))
    setMembers(list)
  }, [])

  // Load members whenever the active server changes (or your own profile is edited)
  useEffect(() => {
    if (!activeServerId) {
      setMembers([])
      return
    }
    loadMembers(activeServerId)
  }, [activeServerId, loadMembers, profile.display_name, profile.username, profile.bio])

  // Presence: who is online, and who is in which voice channel
  useEffect(() => {
    if (!activeServerId) {
      setOnlineIds(new Set())
      setVoiceMap({})
      return
    }
    setOnlineIds(new Set())
    setVoiceMap({})
    const room = supabase.channel(`presence:${activeServerId}`, {
      config: { presence: { key: profile.id } },
    })
    presenceRef.current = room
    room
      .on('presence', { event: 'sync' }, () => {
        const state = room.presenceState<{ online_at: string; voice_channel: string | null }>()
        setOnlineIds(new Set(Object.keys(state)))
        const map: Record<string, string[]> = {}
        for (const [userId, metas] of Object.entries(state)) {
          const vc = metas.find(m => m.voice_channel)?.voice_channel
          if (vc) (map[vc] ??= []).push(userId)
        }
        setVoiceMap(map)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await room.track({ online_at: onlineAtRef.current, voice_channel: voiceChannelRef.current })
        }
      })
    return () => {
      presenceRef.current = null
      supabase.removeChannel(room)
    }
  }, [activeServerId, profile.id])

  // Tell everyone when we join or leave a voice channel
  useEffect(() => {
    const room = presenceRef.current
    if (!room) return
    void (async () => {
      try {
        await room.track({ online_at: onlineAtRef.current, voice_channel: voice.channelId })
      } catch (e) {
        console.error(e)
      }
    })()
  }, [voice.channelId])

  // Load history and subscribe to new and deleted messages whenever the channel changes
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([])
      return
    }
    let cancelled = false
    setMessages([])

    supabase
      .from('messages')
      .select('id, user_id, content, created_at')
      .eq('channel_id', activeChannelId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error(error)
        if (cancelled) return
        const history = ((data ?? []) as Message[]).reverse()
        setMessages(prev => {
          const ids = new Set(history.map(m => m.id))
          return [...history, ...prev.filter(m => !ids.has(m.id))]
        })
      })

    const sub = supabase
      .channel(`messages:${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${activeChannelId}`,
        },
        payload => {
          const m = payload.new as Message
          setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        const id = (payload.old as { id?: number }).id
        if (id !== undefined) setMessages(prev => prev.filter(x => x.id !== id))
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(sub)
    }
  }, [activeChannelId])

  function selectServer(id: string) {
    // Voice stays connected while you browse channels, but not across servers
    const voiceServerId = servers.find(s => s.channels.some(c => c.id === voice.channelId))?.id
    if (voice.channelId && voiceServerId !== id) voice.leave()
    setServerId(id)
    setChannelId(null)
    setSelectedMemberId(null)
  }

  async function refresh() {
    await loadServers()
    if (activeServerId) await loadMembers(activeServerId)
  }

  function handleLeft() {
    voice.leave()
    setShowSettings(false)
    setServerId(null)
    setChannelId(null)
    setMembers([])
    loadServers()
  }

  async function sendMessage(text: string): Promise<string | null> {
    if (!channel) return 'No channel selected.'
    const { data, error } = await supabase
      .from('messages')
      .insert({ channel_id: channel.id, user_id: profile.id, content: text })
      .select('id, user_id, content, created_at')
      .single()
    if (error) return error.message
    const m = data as Message
    setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
    return null
  }

  async function deleteMessage(id: number): Promise<string | null> {
    const { error } = await supabase.rpc('delete_message', { mid: id })
    if (error) return error.message
    setMessages(prev => prev.filter(m => m.id !== id))
    return null
  }

  if (loading) {
    return <div className="h-dvh flex items-center justify-center bg-[#313338] text-gray-400">Loading...</div>
  }

  return (
    <div className="flex h-dvh bg-[#313338] text-gray-100">
      {/* Dimmed backdrops that close the mobile panels */}
      {navOpen && <div className="fixed inset-0 z-[5] bg-black/60 md:hidden" onClick={() => setNavOpen(false)} />}
      {membersOpen && (
        <div className="fixed inset-0 z-[5] bg-black/60 lg:hidden" onClick={() => setMembersOpen(false)} />
      )}

      {/* Servers and channels: a slide-out panel on phones, a fixed column on larger screens */}
      <div
        className={`fixed inset-y-0 left-0 z-[6] flex transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ServerRail
          servers={servers}
          activeId={server?.id ?? null}
          onSelect={selectServer}
          onAdd={() => {
            setNavOpen(false)
            setShowModal(true)
          }}
        />
        {server && channel && (
          <ChannelSidebar
            server={server}
            activeChannelId={channel.id}
            onSelect={id => {
              setChannelId(id)
              setNavOpen(false)
            }}
            profile={profile}
            myRole={myRole}
            voice={voice}
            voiceOccupants={voiceOccupants}
            onAddChannel={() => {
              setNavOpen(false)
              setShowChannelModal(true)
            }}
            onOpenSettings={() => {
              setNavOpen(false)
              setShowSettings(true)
            }}
            onEditProfile={() => {
              setNavOpen(false)
              onEditProfile()
            }}
            onSignOut={onSignOut}
          />
        )}
      </div>

      {server && channel ? (
        <>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* On phones the voice controls live here, so they are visible without opening the panel */}
            <div className="md:hidden">
              <VoiceBar voice={voice} channelName={joinedChannelName} edge="bottom" />
            </div>
            <ChatArea
              channel={channel}
              messages={messages}
              members={members}
              myId={profile.id}
              myRank={myRank}
              onSend={sendMessage}
              onDelete={deleteMessage}
              onSelectMember={setSelectedMemberId}
              onOpenNav={() => setNavOpen(true)}
              onOpenMembers={() => setMembersOpen(true)}
            />
          </div>

          {/* Members: a slide-out panel below the large breakpoint, a fixed column above it */}
          <div
            className={`fixed inset-y-0 right-0 z-[6] w-72 max-w-[85vw] transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 ${
              membersOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <MemberList
              members={members}
              onlineIds={onlineIds}
              onSelect={id => {
                setSelectedMemberId(id)
                setMembersOpen(false)
              }}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
          <h2 className="text-xl font-semibold">You're not in any servers yet</h2>
          <p className="text-gray-400">Create one, or join a friend's with an invite code.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="rounded bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-600"
            >
              Create or join
            </button>
            <button onClick={onSignOut} className="rounded bg-white/10 px-4 py-2 hover:bg-white/20">
              Sign out
            </button>
          </div>
        </div>
      )}

      {selectedMember && (
        <ProfileCard
          member={selectedMember}
          online={onlineIds.has(selectedMember.id)}
          onClose={() => setSelectedMemberId(null)}
        />
      )}

      {showSettings && server && (
        <ServerSettings
          server={server}
          myRole={myRole}
          members={members}
          myId={profile.id}
          onClose={() => setShowSettings(false)}
          onChanged={refresh}
          onLeft={handleLeft}
        />
      )}

      {showModal && (
        <ServerModal
          onClose={() => setShowModal(false)}
          onDone={id => {
            setShowModal(false)
            loadServers(id)
          }}
        />
      )}

      {showChannelModal && server && (
        <ChannelModal
          serverId={server.id}
          onClose={() => setShowChannelModal(false)}
          onDone={newChannelId => {
            setShowChannelModal(false)
            loadServers(server.id, newChannelId)
          }}
        />
      )}
    </div>
  )
}