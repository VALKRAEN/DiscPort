import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Server, Profile, Message, Member, Role } from './types'
import { rank } from './roles'
import ServerRail from './components/ServerRail'
import ChannelSidebar from './components/ChannelSidebar'
import ChatArea from './components/ChatArea'
import MemberList from './components/MemberList'
import ServerModal from './components/ServerModal'
import ChannelModal from './components/ChannelModal'
import ProfileCard from './components/ProfileCard'
import ServerSettings from './components/ServerSettings'

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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const loadServers = useCallback(async (selectServerId?: string, selectChannelId?: string) => {
    const { data, error } = await supabase
      .from('servers')
      .select('id, name, color, invite_code, channels(id, name, created_at)')
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
  const channel = server?.channels.find(c => c.id === channelId) ?? server?.channels[0] ?? null
  const activeServerId = server?.id
  const activeChannelId = channel?.id

  const activeServerRef = useRef<string | undefined>(undefined)
  activeServerRef.current = activeServerId

  const myRole: Role = members.find(m => m.id === profile.id)?.role ?? 'member'
  const myRank = rank[myRole]
  const selectedMember = members.find(m => m.id === selectedMemberId) ?? null

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

  // Load members whenever the active server changes
  useEffect(() => {
    if (!activeServerId) {
      setMembers([])
      return
    }
    loadMembers(activeServerId)
  }, [activeServerId, loadMembers])

  // Presence: announce that we're online in this server, and listen for others
  useEffect(() => {
    if (!activeServerId) {
      setOnlineIds(new Set())
      return
    }
    setOnlineIds(new Set())
    const room = supabase.channel(`presence:${activeServerId}`, {
      config: { presence: { key: profile.id } },
    })
    room
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(room.presenceState())))
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await room.track({ online_at: new Date().toISOString() })
        }
      })
    return () => {
      supabase.removeChannel(room)
    }
  }, [activeServerId, profile.id])

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
    setServerId(id)
    setChannelId(null)
    setSelectedMemberId(null)
  }

  async function refresh() {
    await loadServers()
    if (activeServerId) await loadMembers(activeServerId)
  }

  function handleLeft() {
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
    return <div className="h-screen flex items-center justify-center bg-[#313338] text-gray-400">Loading...</div>
  }

  return (
    <div className="flex h-screen bg-[#313338] text-gray-100">
      <ServerRail
        servers={servers}
        activeId={server?.id ?? null}
        onSelect={selectServer}
        onAdd={() => setShowModal(true)}
      />

      {server && channel ? (
        <>
          <ChannelSidebar
            server={server}
            activeChannelId={channel.id}
            onSelect={setChannelId}
            profile={profile}
            myRole={myRole}
            onAddChannel={() => setShowChannelModal(true)}
            onOpenSettings={() => setShowSettings(true)}
            onEditProfile={onEditProfile}
            onSignOut={onSignOut}
          />
          <ChatArea
            channel={channel}
            messages={messages}
            members={members}
            myId={profile.id}
            myRank={myRank}
            onSend={sendMessage}
            onDelete={deleteMessage}
            onSelectMember={setSelectedMemberId}
          />
          <MemberList members={members} onlineIds={onlineIds} onSelect={setSelectedMemberId} />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
          <h2 className="text-xl font-semibold">You're not in any servers yet</h2>
          <p className="text-gray-400">Create one, or join a friend's with an invite code.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="rounded bg-indigo-500 hover:bg-indigo-600 px-4 py-2 font-semibold"
            >
              Create or join
            </button>
            <button onClick={onSignOut} className="rounded bg-white/10 hover:bg-white/20 px-4 py-2">
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