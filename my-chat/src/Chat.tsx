import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Server, Profile, Message, Member, Role } from './types'
import { rank } from './roles'
import { useVoice } from './useVoice'
import { useVoicePresence } from './useVoicePresence'
import { useDms } from './useDms'
import { useFriends } from './useFriends'
import ServerRail from './components/ServerRail'
import ChannelSidebar from './components/ChannelSidebar'
import DmSidebar from './components/DmSidebar'
import ChatArea from './components/ChatArea'
import FriendsPanel from './components/FriendsPanel'
import MemberList from './components/MemberList'
import ServerModal from './components/ServerModal'
import ChannelModal from './components/ChannelModal'
import ProfileCard from './components/ProfileCard'
import ReportModal from './components/ReportModal'
import ServerSettings from './components/ServerSettings'
import VoiceBar from './components/VoiceBar'
import ScreenStage from './components/ScreenStage'

type Props = {
  profile: Profile
  onEditProfile: () => void
  onSignOut: () => void
}

type ReportTarget =
  | { kind: 'user'; userId: string }
  | { kind: 'server_message' | 'dm_message'; messageId: number }

export default function Chat({ profile, onEditProfile, onSignOut }: Props) {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'servers' | 'dms'>('servers')
  const [serverId, setServerId] = useState<string | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [dmId, setDmId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [navOpen, setNavOpen] = useState(false) // mobile: servers and channels panel
  const [membersOpen, setMembersOpen] = useState(false) // mobile: members panel

  const inDms = view === 'dms'
  const voice = useVoice()
  const dm = useDms(profile.id, inDms ? dmId : null)
  const friends = useFriends(profile.id)
  const homeBadge = dm.unread + friends.incoming.length

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

  // Messages from people you blocked are hidden for you
  const visibleMessages = messages.filter(m => !friends.blockedIds.has(m.user_id))

  // The open DM conversation, and the two people in it (so names and avatars work in ChatArea)
  const dmConv = dm.dms.find(d => d.conversation_id === dmId) ?? null
  const dmMembers: Member[] = dmConv
    ? [
        {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_path: profile.avatar_path,
          role: 'member',
        },
        {
          id: dmConv.other_id,
          username: dmConv.other_username,
          display_name: dmConv.other_display_name,
          bio: dmConv.other_bio,
          avatar_path: dmConv.other_avatar_path,
          role: 'member',
        },
      ]
    : []
  const selectedMember = (inDms ? dmMembers : members).find(m => m.id === selectedMemberId) ?? null

  // Which server is the call in? It can differ from the server you're viewing
  const voiceServer = voice.channelId
    ? servers.find(s => s.channels.some(c => c.id === voice.channelId)) ?? null
    : null
  const voiceServerId = voiceServer?.id ?? null
  const voiceLabel = voiceServer
    ? {
        channel: voiceServer.channels.find(c => c.id === voice.channelId)?.name ?? '',
        server: voiceServer.name,
        here: !inDms && voiceServer.id === activeServerId,
      }
    : null

  // Who is in each voice channel of the server you're viewing
  const voiceMap = useVoicePresence(profile.id, activeServerId, voiceServerId, voice.channelId)
  const voiceOccupants: Record<string, { id: string; name: string }[]> = {}
  for (const [cid, ids] of Object.entries(voiceMap)) {
    voiceOccupants[cid] = ids.map(id => ({
      id,
      name: members.find(m => m.id === id)?.display_name ?? 'Unknown',
    }))
  }

  // id -> picture, for places that only know a user id (like voice participants)
  const avatarById: Record<string, string | null> = { [profile.id]: profile.avatar_path }
  for (const m of members) avatarById[m.id] = m.avatar_path

  const loadMembers = useCallback(async (sid: string) => {
    const { data, error } = await supabase
      .from('server_members')
      .select('role, profiles(id, username, display_name, bio, avatar_path)')
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
  }, [activeServerId, loadMembers, profile.display_name, profile.username, profile.bio, profile.avatar_path])

  // Presence: who is online in the server you're viewing
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

  // Switching servers never touches your call
  function selectServer(id: string) {
    setView('servers')
    setServerId(id)
    setChannelId(null)
    setSelectedMemberId(null)
  }

  function goToVoice() {
    if (voiceServer) selectServer(voiceServer.id)
    setNavOpen(false)
  }

  async function startDm(userId: string): Promise<string | null> {
    const r = await dm.start(userId)
    if (r.error || !r.id) return r.error ?? 'Could not start the conversation.'
    setSelectedMemberId(null)
    setMembersOpen(false)
    setView('dms')
    setDmId(r.id)
    setNavOpen(false)
    return null
  }

  async function blockUser(userId: string): Promise<string | null> {
    const err = await friends.block(userId)
    if (err) return err
    if (dmConv?.other_id === userId) setDmId(null)
    setSelectedMemberId(null)
    await dm.reload()
    return null
  }

  async function unblockUser(userId: string): Promise<string | null> {
    const err = await friends.unblock(userId)
    if (!err) await dm.reload()
    return err
  }

  async function submitReport(reason: string): Promise<string | null> {
    if (!report) return 'Nothing to report.'
    const { error } =
      report.kind === 'user'
        ? await supabase.rpc('report_user', { target: report.userId, why: reason })
        : await supabase.rpc('report_message', { msg_kind: report.kind, mid: report.messageId, why: reason })
    return error ? error.message : null
  }

  async function refresh() {
    await loadServers()
    if (activeServerId) await loadMembers(activeServerId)
  }

  function handleLeft() {
    // Only hang up if the call was in the server you just left
    if (voiceServerId && voiceServerId === activeServerId) voice.leave()
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

      {/* Servers, plus channels or DMs: a slide-out panel on phones, fixed columns on larger screens */}
      <div
        className={`fixed inset-y-0 left-0 z-[6] flex transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ServerRail
          servers={servers}
          activeId={inDms ? null : server?.id ?? null}
          homeActive={inDms}
          dmUnread={homeBadge}
          onHome={() => setView('dms')}
          onSelect={selectServer}
          onAdd={() => {
            setNavOpen(false)
            setShowModal(true)
          }}
        />
        {inDms ? (
          <DmSidebar
            dms={dm.dms}
            activeId={dmConv?.conversation_id ?? null}
            friendsActive={!dmConv}
            pendingCount={friends.incoming.length}
            profile={profile}
            voice={voice}
            voiceLabel={voiceLabel}
            onSelect={id => {
              setDmId(id)
              setNavOpen(false)
            }}
            onShowFriends={() => {
              setDmId(null)
              setNavOpen(false)
            }}
            onStart={startDm}
            onGoToVoice={goToVoice}
            onEditProfile={() => {
              setNavOpen(false)
              onEditProfile()
            }}
            onSignOut={onSignOut}
          />
        ) : (
          server &&
          channel && (
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
              avatarById={avatarById}
              voiceLabel={voiceLabel}
              onGoToVoice={goToVoice}
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
          )
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* On phones the voice controls live here, so they are visible without opening the panel */}
        <div className="md:hidden">
          <VoiceBar
            voice={voice}
            channelName={voiceLabel?.channel ?? ''}
            serverName={voiceLabel && !voiceLabel.here ? voiceLabel.server : undefined}
            onGoTo={voiceLabel && !voiceLabel.here ? goToVoice : undefined}
            edge="bottom"
          />
        </div>
        <ScreenStage shares={voice.screens.filter(s => !s.isMe)} />

        {inDms ? (
          dmConv ? (
            <ChatArea
              key={`dm:${dmConv.conversation_id}`}
              resetKey={dmConv.conversation_id}
              title={`@${dmConv.other_display_name}`}
              placeholder={`Message @${dmConv.other_display_name}`}
              messages={dm.messages}
              members={dmMembers}
              myId={profile.id}
              myRank={1}
              onSend={dm.send}
              onDelete={dm.remove}
              onReport={id => setReport({ kind: 'dm_message', messageId: id })}
              onSelectMember={setSelectedMemberId}
              onOpenNav={() => setNavOpen(true)}
              onOpenMembers={() => {}}
              hideMembers
              navBadge={homeBadge}
            />
          ) : (
            <FriendsPanel
              friends={friends.friends}
              incoming={friends.incoming}
              outgoing={friends.outgoing}
              blocks={friends.blocks}
              onAdd={friends.addByUsername}
              onAccept={friends.accept}
              onRemove={friends.remove}
              onMessage={startDm}
              onBlock={blockUser}
              onUnblock={unblockUser}
              onOpenNav={() => setNavOpen(true)}
              navBadge={homeBadge}
            />
          )
        ) : server && channel ? (
          <ChatArea
            key="server-chat"
            resetKey={channel.id}
            title={`# ${channel.name}`}
            placeholder={`Message #${channel.name}`}
            messages={visibleMessages}
            members={members}
            myId={profile.id}
            myRank={myRank}
            onSend={sendMessage}
            onDelete={deleteMessage}
            onReport={id => setReport({ kind: 'server_message', messageId: id })}
            onSelectMember={setSelectedMemberId}
            onOpenNav={() => setNavOpen(true)}
            onOpenMembers={() => setMembersOpen(true)}
            navBadge={homeBadge}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
            <h2 className="text-xl font-semibold">You're not in any servers yet</h2>
            <p className="text-gray-400">Create one, or join a friend's with an invite code.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setShowModal(true)}
                className="rounded bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-600"
              >
                Create or join
              </button>
              <button onClick={() => setView('dms')} className="rounded bg-white/10 px-4 py-2 hover:bg-white/20">
                Friends and messages{homeBadge > 0 ? ` (${homeBadge})` : ''}
              </button>
              <button onClick={onSignOut} className="rounded bg-white/10 px-4 py-2 hover:bg-white/20">
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members: a slide-out panel below the large breakpoint, a fixed column above it */}
      {!inDms && server && channel && (
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
      )}

      {selectedMember && (
        <ProfileCard
          member={selectedMember}
          online={inDms ? undefined : onlineIds.has(selectedMember.id)}
          friendState={friends.stateWith(selectedMember.id)}
          blocked={friends.blockedIds.has(selectedMember.id)}
          onClose={() => setSelectedMemberId(null)}
          onMessage={selectedMember.id !== profile.id ? () => startDm(selectedMember.id) : undefined}
          onAddFriend={selectedMember.id !== profile.id ? () => friends.addById(selectedMember.id) : undefined}
          onBlock={selectedMember.id !== profile.id ? () => blockUser(selectedMember.id) : undefined}
          onUnblock={selectedMember.id !== profile.id ? () => unblockUser(selectedMember.id) : undefined}
          onReport={
            selectedMember.id !== profile.id
              ? () => setReport({ kind: 'user', userId: selectedMember.id })
              : undefined
          }
        />
      )}

      {report && (
        <ReportModal
          title={report.kind === 'user' ? 'Report this user' : 'Report this message'}
          onSubmit={submitReport}
          onClose={() => setReport(null)}
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
            setView('servers')
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