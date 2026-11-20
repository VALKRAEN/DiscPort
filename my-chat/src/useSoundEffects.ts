import { useEffect, useRef } from 'react'
import { playSound } from './sounds'
import type { VoiceApi } from './useVoice'
import type { DmSummary, Message } from './types'
import type { FriendRow } from './useFriends'

type Args = {
  myId: string
  voice: VoiceApi
  dms: DmSummary[]
  dmsLoaded: boolean
  incomingRequests: FriendRow[]
  friendsLoaded: boolean
  inDms: boolean
  openDmId: string | null
  channelKey: string | null
  messages: Message[]
}

export function useSoundEffects({
  myId,
  voice,
  dms,
  dmsLoaded,
  incomingRequests,
  friendsLoaded,
  inDms,
  openDmId,
  channelKey,
  messages,
}: Args) {
  // You joined or left a call
  const wasConnected = useRef(false)
  useEffect(() => {
    const connected = voice.status === 'connected'
    if (connected && !wasConnected.current) playSound('selfJoin')
    else if (!connected && wasConnected.current) playSound('selfLeave')
    wasConnected.current = connected
  }, [voice.status])

  // Someone else joined or left your call
  const people = useRef<{ channel: string; ids: Set<string> } | null>(null)
  useEffect(() => {
    if (voice.status !== 'connected' || !voice.channelId) {
      people.current = null
      return
    }
    const ids = new Set(voice.participants.filter(p => !p.isMe).map(p => p.id))
    const prev = people.current
    if (prev && prev.channel === voice.channelId) {
      let joined = false
      let left = false
      ids.forEach(id => {
        if (!prev.ids.has(id)) joined = true
      })
      prev.ids.forEach(id => {
        if (!ids.has(id)) left = true
      })
      if (joined) playSound('join')
      else if (left) playSound('leave')
    }
    people.current = { channel: voice.channelId, ids }
  }, [voice.participants, voice.status, voice.channelId])

  // You muted, unmuted, deafened, or undeafened
  const mic = useRef<{ muted: boolean; deafened: boolean } | null>(null)
  useEffect(() => {
    if (voice.status !== 'connected') {
      mic.current = null
      return
    }
    const prev = mic.current
    mic.current = { muted: voice.muted, deafened: voice.deafened }
    if (!prev) return
    if (voice.deafened !== prev.deafened) playSound(voice.deafened ? 'deafen' : 'undeafen')
    else if (voice.muted !== prev.muted) playSound(voice.muted ? 'mute' : 'unmute')
  }, [voice.status, voice.muted, voice.deafened])

  // A new direct message arrived
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
      if (!isNew) continue
      const looking = inDms && openDmId === d.conversation_id && document.hasFocus()
      if (!looking) {
        playSound('dm')
        break
      }
    }
  }, [dms, dmsLoaded, inDms, openDmId, myId])

  // A new friend request arrived
  const requestKey = incomingRequests.map(r => r.friendship_id).join(',')
  const lastRequests = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!friendsLoaded) return
    const ids = new Set(requestKey ? requestKey.split(',') : [])
    const prev = lastRequests.current
    lastRequests.current = ids
    if (!prev) return
    for (const id of ids) {
      if (!prev.has(id)) {
        playSound('friend')
        break
      }
    }
  }, [requestKey, friendsLoaded])

  // A new message in the open channel while the window is in the background
  const channel = useRef<{ key: string | null; lastId: number | null }>({ key: null, lastId: null })
  useEffect(() => {
    if (channel.current.key !== channelKey) channel.current = { key: channelKey, lastId: null }
    const last = messages[messages.length - 1]
    if (!last) {
      channel.current.lastId = null
      return
    }
    if (channel.current.lastId === null) {
      channel.current.lastId = last.id // first load of this channel: no sound
      return
    }
    if (last.id > channel.current.lastId) {
      channel.current.lastId = last.id
      if (last.user_id !== myId && !document.hasFocus()) playSound('message')
    }
  }, [messages, channelKey, myId])
}