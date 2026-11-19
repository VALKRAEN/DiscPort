import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

type VoiceMeta = { voice_channel: string }

function buildMap(state: Record<string, VoiceMeta[]>) {
  const map: Record<string, string[]> = {}
  for (const [userId, metas] of Object.entries(state)) {
    const vc = metas.find(m => m.voice_channel)?.voice_channel
    if (vc) (map[vc] ??= []).push(userId)
  }
  return map
}

/**
 * Tracks who is in which voice channel. Keeps a presence room open for the server
 * you are viewing AND for the server your call is in, so your call stays visible
 * to others while you browse a different server.
 */
export function useVoicePresence(
  myId: string,
  activeServerId: string | undefined,
  voiceServerId: string | null,
  voiceChannelId: string | null
) {
  const [voiceMap, setVoiceMap] = useState<Record<string, string[]>>({})
  const rooms = useRef(new Map<string, RealtimeChannel>())
  const trackedRoom = useRef<RealtimeChannel | null>(null)
  const activeRef = useRef(activeServerId)
  const voiceServerRef = useRef(voiceServerId)
  const voiceChannelRef = useRef(voiceChannelId)
  activeRef.current = activeServerId
  voiceServerRef.current = voiceServerId
  voiceChannelRef.current = voiceChannelId

  // Open and close rooms as the viewed server and call server change
  useEffect(() => {
    const wanted = new Set<string>()
    if (activeServerId) wanted.add(activeServerId)
    if (voiceServerId) wanted.add(voiceServerId)

    for (const [sid, room] of rooms.current) {
      if (wanted.has(sid)) continue
      if (trackedRoom.current === room) trackedRoom.current = null
      supabase.removeChannel(room)
      rooms.current.delete(sid)
    }

    for (const sid of wanted) {
      if (rooms.current.has(sid)) continue
      const room = supabase.channel(`voice:${sid}`, { config: { presence: { key: myId } } })
      room
        .on('presence', { event: 'sync' }, () => {
          if (activeRef.current === sid) setVoiceMap(buildMap(room.presenceState<VoiceMeta>()))
        })
        .subscribe(async status => {
          if (status === 'SUBSCRIBED' && voiceServerRef.current === sid && voiceChannelRef.current) {
            trackedRoom.current = room
            await room.track({ voice_channel: voiceChannelRef.current })
          }
        })
      rooms.current.set(sid, room)
    }

    const current = activeServerId ? rooms.current.get(activeServerId) : undefined
    setVoiceMap(current ? buildMap(current.presenceState<VoiceMeta>()) : {})
  }, [activeServerId, voiceServerId, myId])

  // Announce (or withdraw) our voice channel when we join, move, or leave a call
  useEffect(() => {
    const room = voiceServerId ? rooms.current.get(voiceServerId) ?? null : null
    void (async () => {
      try {
        if (trackedRoom.current && (trackedRoom.current !== room || !voiceChannelId)) {
          const old = trackedRoom.current
          trackedRoom.current = null
          await old.untrack()
        }
        if (room && voiceChannelId) {
          trackedRoom.current = room
          await room.track({ voice_channel: voiceChannelId })
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [voiceServerId, voiceChannelId])

  // Close everything when the chat goes away
  useEffect(() => {
    const map = rooms.current
    return () => {
      map.forEach(room => supabase.removeChannel(room))
      map.clear()
      trackedRoom.current = null
    }
  }, [])

  return voiceMap
}