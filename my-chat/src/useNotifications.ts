import { useEffect, useRef } from 'react'
import type { DmSummary, Member, Message } from './types'
import type { FriendRow } from './useFriends'
import { shouldNotify, showLocalNotification } from './notify'
import { resyncPush, setAppBadge } from './pwa'

type Args = {
  myId: string
  dms: DmSummary[]
  dmsLoaded: boolean
  incomingRequests: FriendRow[]
  friendsLoaded: boolean
  inDms: boolean
  openDmId: string | null
  channelKey: string | null
  channelName: string
  messages: Message[]
  members: Member[]
  unreadCount: number
  onOpenDm: (conversationId: string) => void
  onOpenFriends: () => void
}

// True when you are not looking at the app (another window or tab)
const away = () => document.hidden || !document.hasFocus()
const UUID = /^[0-9a-f-]{36}$/i

export function useNotifications({
  myId,
  dms,
  dmsLoaded,
  incomingRequests,
  friendsLoaded,
  inDms,
  openDmId,
  channelKey,
  channelName,
  messages,
  members,
  unreadCount,
  onOpenDm,
  onOpenFriends,
}: Args) {
  const openDmRef = useRef(onOpenDm)
  const openFriendsRef = useRef(onOpenFriends)
  openDmRef.current = onOpenDm
  openFriendsRef.current = onOpenFriends

  // Unread count on the tab title and on the app icon
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) My Chat` : 'My Chat'
    setAppBadge(unreadCount)
  }, [unreadCount])

  // Link this device to your account for push after signing in
  useEffect(() => {
    void resyncPush()
  }, [myId])

  // Tapping a notification while the app is open
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    function onMessage(e: MessageEvent) {
      if (e.data?.type !== 'notification-click') return
      const d = e.data.data as { kind?: string; conversationId?: string } | undefined
      if (d?.kind === 'dm' && d.conversationId) openDmRef.current(d.conversationId)
      else if (d?.kind === 'friend') openFriendsRef.current()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  // Opening the app from a notification when it was closed
  useEffect(() => {
    const url = new URL(window.location.href)
    const dmParam = url.searchParams.get('dm')
    const friendsParam = url.searchParams.get('friends')
    if (!dmParam && !friendsParam) return
    if (dmParam && UUID.test(dmParam)) openDmRef.current(dmParam)
    else if (friendsParam) openFriendsRef.current()
    url.searchParams.delete('dm')
    url.searchParams.delete('friends')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [])

  // A new direct message
  const lastDm = useRef<Map<string, string> | null>(null)
  useEffect(() => {
    if (!dmsLoaded) return
    const prev = lastDm.current
    lastDm.current = new Map(dms.map(d => [d.conversation_id, d.last_at]))
    if (!prev) return // the first load only sets the starting point

    for (const d of dms) {
      if (!d.last_content || d.last_user_id === myId) continue
      const before = prev.get(d.conversation_id)
      const isNew = before === undefined || Date.parse(d.last_at) > Date.parse(before)
      if (!isNew || !away() || !shouldNotify('dm')) continue
      const id = d.conversation_id
      void showLocalNotification(
        { title: d.other_display_name, body: d.last_content, tag: `dm:${id}`, data: { kind: 'dm', conversationId: id } },
        () => openDmRef.current(id)
      )
    }
  }, [dms, dmsLoaded, inDms, openDmId, myId])

  // A new friend request
  const requestKey = incomingRequests.map(r => r.friendship_id).join(',')
  const lastRequests = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!friendsLoaded) return
    const ids = new Set(requestKey ? requestKey.split(',') : [])
    const prev = lastRequests.current
    lastRequests.current = ids
    if (!prev) return

    for (const r of incomingRequests) {
      if (prev.has(String(r.friendship_id)) || !away() || !shouldNotify('friend')) continue
      void showLocalNotification(
        {
          title: 'New friend request',
          body: `${r.other_display_name} wants to be your friend`,
          tag: `friend:${r.friendship_id}`,
          data: { kind: 'friend' },
        },
        () => openFriendsRef.current()
      )
    }
  }, [requestKey, friendsLoaded])

  // A new message in the channel you have open
  const channel = useRef<{ key: string | null; lastId: number | null }>({ key: null, lastId: null })
  useEffect(() => {
    if (channel.current.key !== channelKey) channel.current = { key: channelKey, lastId: null }
    const last = messages[messages.length - 1]
    if (!last) {
      channel.current.lastId = null
      return
    }
    if (channel.current.lastId === null) {
      channel.current.lastId = last.id // first load of this channel: no banner
      return
    }
    if (last.id > channel.current.lastId) {
      channel.current.lastId = last.id
      if (last.user_id !== myId && away() && shouldNotify('channel')) {
        const name = members.find(m => m.id === last.user_id)?.display_name ?? 'Someone'
        void showLocalNotification({
          title: `${name} in #${channelName}`,
          body: last.content,
          tag: `channel:${channelKey}`,
          data: { kind: 'channel' },
        })
      }
    }
  }, [messages, channelKey, myId])
}