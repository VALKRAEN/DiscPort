import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { DmMessage, DmSummary } from './types'

/**
 * Loads your conversation list, listens for new messages live, and manages the
 * messages of the conversation you have open (activeId).
 * Pass activeId = null whenever you are not looking at DMs, so messages stay unread.
 */
export function useDms(myId: string, activeId: string | null) {
  const [dms, setDms] = useState<DmSummary[]>([])
  const [messages, setMessages] = useState<DmMessage[]>([])
  const activeRef = useRef<string | null>(activeId)
  activeRef.current = activeId

  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_dms')
    if (error) {
      console.error(error)
      return
    }
    setDms((data ?? []) as DmSummary[])
  }, [])

  const markRead = useCallback(
    async (cid: string) => {
      const { error } = await supabase.rpc('mark_dm_read', { cid })
      if (error) console.error(error)
      await reload()
    },
    [reload]
  )

  // One subscription for all of your conversations
  useEffect(() => {
    reload()
    const sub = supabase
      .channel(`dm-inbox:${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, payload => {
        const m = payload.new as DmMessage
        if (m.conversation_id === activeRef.current) {
          setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
          if (m.user_id !== myId) {
            markRead(m.conversation_id)
            return
          }
        }
        reload()
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'dm_messages' }, payload => {
        const id = (payload.old as { id?: number }).id
        if (id !== undefined) {
          setMessages(prev => prev.filter(x => x.id !== id))
          reload()
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(sub)
    }
  }, [myId, reload, markRead])

  // Load history whenever the open conversation changes
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let cancelled = false
    setMessages([])

    supabase
      .from('dm_messages')
      .select('id, conversation_id, user_id, content, created_at')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error(error)
        if (cancelled) return
        const history = ((data ?? []) as DmMessage[]).reverse()
        setMessages(prev => {
          const ids = new Set(history.map(m => m.id))
          return [...history, ...prev.filter(m => !ids.has(m.id))]
        })
      })

    markRead(activeId)
    return () => {
      cancelled = true
    }
  }, [activeId, markRead])

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const cid = activeRef.current
      if (!cid) return 'No conversation selected.'
      const { data, error } = await supabase
        .from('dm_messages')
        .insert({ conversation_id: cid, user_id: myId, content: text })
        .select('id, conversation_id, user_id, content, created_at')
        .single()
      if (error) {
        return error.code === '42501' ? "You can't message this person right now." : error.message
      }
      const m = data as DmMessage
      setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
      reload()
      return null
    },
    [myId, reload]
  )

  const remove = useCallback(
    async (id: number): Promise<string | null> => {
      const { error } = await supabase.rpc('delete_dm_message', { mid: id })
      if (error) return error.message
      setMessages(prev => prev.filter(m => m.id !== id))
      reload()
      return null
    },
    [reload]
  )

  const start = useCallback(
    async (userId: string): Promise<{ id: string | null; error: string | null }> => {
      const { data, error } = await supabase.rpc('start_dm', { target: userId })
      if (error) return { id: null, error: error.message }
      await reload()
      return { id: data as string, error: null }
    },
    [reload]
  )

  return { dms, messages, unread: dms.filter(d => d.unread).length, send, remove, start, reload }
}