import { useCallback, useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import type { LocalVideoTrack, Participant, RemoteTrack, RemoteVideoTrack } from 'livekit-client'
import { supabase } from './supabase'

export type VoiceParticipant = {
  id: string
  name: string
  speaking: boolean
  muted: boolean
  sharing: boolean
  isMe: boolean
}
export type ScreenShare = {
  id: string
  name: string
  isMe: boolean
  track: LocalVideoTrack | RemoteVideoTrack
}
export type VoiceStatus = 'idle' | 'connecting' | 'connected'

// Phones and some browsers cannot share their screen (they can still watch others)
export const canShareScreen =
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'

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
  const [screens, setScreens] = useState<ScreenShare[]>([])

  const setMuted = useCallback((v: boolean) => {
    mutedRef.current = v
    setMutedState(v)
  }, [])

  const setDeafened = useCallback((v: boolean) => {
    deafenedRef.current = v
    setDeafenedState(v)
  }, [])

  const snapshot = useCallback((room: Room) => {
    const all: { p: Participant; isMe: boolean }[] = [
      { p: room.localParticipant, isMe: true },
      ...Array.from(room.remoteParticipants.values()).map(p => ({ p, isMe: false })),
    ]

    setParticipants(
      all.map(({ p, isMe }) => ({
        id: p.identity,
        name: p.name || 'Unknown',
        speaking: p.isSpeaking,
        muted: !p.isMicrophoneEnabled,
        sharing: p.isScreenShareEnabled,
        isMe,
      }))
    )

    const shares: ScreenShare[] = []
    for (const { p, isMe } of all) {
      const track = p.getTrackPublication(Track.Source.ScreenShare)?.track
      if (track && track.kind === Track.Kind.Video) {
        shares.push({
          id: p.identity,
          name: p.name || 'Unknown',
          isMe,
          track: track as LocalVideoTrack | RemoteVideoTrack,
        })
      }
    }
    setScreens(shares)
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
    setScreens([])
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
          if (track.kind === Track.Kind.Audio) {
            // Covers microphones and shared-tab audio
            const el = track.attach()
            el.muted = deafenedRef.current
            document.body.appendChild(el)
            audioEls.current.add(el)
            return
          }
          refresh() // a screen share started
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio) {
            track.detach().forEach(el => {
              el.remove()
              audioEls.current.delete(el)
            })
          }
          refresh()
        })
        .on(RoomEvent.ParticipantConnected, refresh)
        .on(RoomEvent.ParticipantDisconnected, refresh)
        .on(RoomEvent.ActiveSpeakersChanged, refresh)
        .on(RoomEvent.TrackMuted, refresh)
        .on(RoomEvent.TrackUnmuted, refresh)
        .on(RoomEvent.LocalTrackPublished, refresh)
        .on(RoomEvent.LocalTrackUnpublished, refresh)
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

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const next = !room.localParticipant.isScreenShareEnabled
    try {
      // audio: true also shares tab or system sound where the browser supports it
      await room.localParticipant.setScreenShareEnabled(next, next ? { audio: true } : undefined)
    } catch (e) {
      // Closing the picker without choosing anything is not worth an error message
      const name = (e as { name?: string })?.name
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        console.error(e)
        setError('Could not start screen sharing.')
      }
    }
    if (roomRef.current === room) snapshot(room)
  }, [snapshot])

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

  const sharing = screens.some(s => s.isMe)

  return {
    channelId,
    status,
    error,
    muted,
    deafened,
    participants,
    screens,
    sharing,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
  }
}

export type VoiceApi = ReturnType<typeof useVoice>