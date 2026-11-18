import { useCallback, useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import type { Participant, RemoteTrack } from 'livekit-client'
import { supabase } from './supabase'

export type VoiceParticipant = {
  id: string
  name: string
  speaking: boolean
  muted: boolean
  isMe: boolean
}
export type VoiceStatus = 'idle' | 'connecting' | 'connected'

export function useVoice() {
  const roomRef = useRef<Room | null>(null)
  const channelRef = useRef<string | null>(null)
  const audioEls = useRef<Set<HTMLMediaElement>>(new Set())
  const joinSeq = useRef(0)
  const mutedRef = useRef(false)
  const deafenedRef = useRef(false)
  const mutedBeforeDeafen = useRef(false)

  const [channelId, setChannelId] = useState<string | null>(null)
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState('')
  const [muted, setMutedState] = useState(false)
  const [deafened, setDeafenedState] = useState(false)
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])

  const setMuted = useCallback((v: boolean) => {
    mutedRef.current = v
    setMutedState(v)
  }, [])

  const setDeafened = useCallback((v: boolean) => {
    deafenedRef.current = v
    setDeafenedState(v)
  }, [])

  const snapshot = useCallback((room: Room) => {
    const toP = (p: Participant, isMe: boolean): VoiceParticipant => ({
      id: p.identity,
      name: p.name || 'Unknown',
      speaking: p.isSpeaking,
      muted: !p.isMicrophoneEnabled,
      isMe,
    })
    setParticipants([
      toP(room.localParticipant, true),
      ...Array.from(room.remoteParticipants.values()).map(p => toP(p, false)),
    ])
  }, [])

  const reset = useCallback(() => {
    audioEls.current.forEach(el => el.remove())
    audioEls.current.clear()
    channelRef.current = null
    mutedBeforeDeafen.current = false
    setMuted(false)
    setDeafened(false)
    setChannelId(null)
    setStatus('idle')
    setParticipants([])
  }, [setMuted, setDeafened])

  const leave = useCallback(() => {
    joinSeq.current++
    const room = roomRef.current
    roomRef.current = null
    room?.disconnect()
    reset()
  }, [reset])

  const join = useCallback(
    async (id: string) => {
      if (roomRef.current && channelRef.current === id) return
      if (roomRef.current) leave()

      const seq = ++joinSeq.current
      channelRef.current = id
      setError('')
      setChannelId(id)
      setStatus('connecting')

      const fail = (message: string) => {
        if (seq !== joinSeq.current) return
        reset()
        setError(message)
      }

      // 1. Ask our Edge Function for a token
      const { data, error: fnError } = await supabase.functions.invoke('livekit-token', {
        body: { channel_id: id },
      })
      if (seq !== joinSeq.current) return
      if (fnError || !data?.token || !data?.url) {
        let message = 'Could not join voice.'
        const ctx = (fnError as any)?.context
        if (ctx && typeof ctx.json === 'function') {
          try {
            message = (await ctx.json()).error ?? message
          } catch {
            /* keep the default message */
          }
        } else if (fnError?.message) {
          message = fnError.message
        }
        fail(message)
        return
      }

      // 2. Connect to the LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const refresh = () => {
        if (roomRef.current === room) snapshot(room)
      }

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return
          const el = track.attach()
          el.muted = deafenedRef.current
          document.body.appendChild(el)
          audioEls.current.add(el)
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach().forEach(el => {
            el.remove()
            audioEls.current.delete(el)
          })
        })
        .on(RoomEvent.ParticipantConnected, refresh)
        .on(RoomEvent.ParticipantDisconnected, refresh)
        .on(RoomEvent.ActiveSpeakersChanged, refresh)
        .on(RoomEvent.TrackMuted, refresh)
        .on(RoomEvent.TrackUnmuted, refresh)
        .on(RoomEvent.LocalTrackPublished, refresh)
        .on(RoomEvent.Disconnected, () => {
          if (roomRef.current === room) {
            roomRef.current = null
            reset()
          }
        })

      try {
        await room.connect(data.url, data.token)
      } catch (e) {
        console.error(e)
        room.disconnect()
        fail('Could not connect to the voice server.')
        return
      }
      if (seq !== joinSeq.current) {
        room.disconnect()
        return
      }

      roomRef.current = room
      setStatus('connected')
      snapshot(room)
      room.startAudio().catch(() => {})

      // 3. Turn on the microphone (the browser asks for permission the first time)
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        setMuted(false)
      } catch (e) {
        console.error(e)
        setMuted(true)
        setError(
          'Your microphone is blocked or unavailable, so you can listen but not talk. Allow microphone access for this site in your browser, then rejoin.'
        )
      }
      if (roomRef.current === room) snapshot(room)
    },
    [leave, reset, snapshot, setMuted]
  )

  const toggleDeafen = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const next = !deafenedRef.current
    setDeafened(next)
    audioEls.current.forEach(el => {
      el.muted = next
    })
    try {
      if (next) {
        mutedBeforeDeafen.current = mutedRef.current
        await room.localParticipant.setMicrophoneEnabled(false)
        setMuted(true)
      } else if (!mutedBeforeDeafen.current) {
        await room.localParticipant.setMicrophoneEnabled(true)
        setMuted(false)
      }
    } catch (e) {
      console.error(e)
    }
    if (roomRef.current === room) snapshot(room)
  }, [setDeafened, setMuted, snapshot])

  const toggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    if (deafenedRef.current) {
      // Unmuting while deafened also undeafens, like Discord
      mutedBeforeDeafen.current = false
      await toggleDeafen()
      return
    }
    const next = !mutedRef.current
    try {
      await room.localParticipant.setMicrophoneEnabled(!next)
    } catch (e) {
      console.error(e)
      setError('Could not access your microphone.')
      return
    }
    setMuted(next)
    if (roomRef.current === room) snapshot(room)
  }, [toggleDeafen, setMuted, snapshot])

  // Disconnect when the component goes away (for example on sign out)
  useEffect(
    () => () => {
      joinSeq.current++
      const room = roomRef.current
      roomRef.current = null
      room?.disconnect()
      audioEls.current.forEach(el => el.remove())
      audioEls.current.clear()
    },
    []
  )

  return { channelId, status, error, muted, deafened, participants, join, leave, toggleMute, toggleDeafen }
}

export type VoiceApi = ReturnType<typeof useVoice>