import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'

export type FriendRow = {
  friendship_id: number
  other_id: string
  other_username: string
  other_display_name: string
  other_bio: string
  status: 'pending' | 'accepted'
  direction: 'friend' | 'incoming' | 'outgoing'
}
export type BlockedUser = { user_id: string; username: string; display_name: string }
export type FriendState = 'none' | 'friend' | 'incoming' | 'outgoing'

type Result = PromiseLike<{ error: { message: string } | null }>

export function useFriends(myId: string) {
  const [rows, setRows] = useState<FriendRow[]>([])
  const [blocks, setBlocks] = useState<BlockedUser[]>([])
  const knownIds = useRef<Set<number>>(new Set())

  const reload = useCallback(async () => {
    const [f, b] = await Promise.all([supabase.rpc('my_friends'), supabase.rpc('my_blocks')])
    if (f.error) {
      console.error(f.error)
    } else {
      const list = (f.data ?? []) as FriendRow[]
      knownIds.current = new Set(list.map(r => r.friendship_id))
      setRows(list)
    }
    if (b.error) console.error(b.error)
    else setBlocks((b.data ?? []) as BlockedUser[])
  }, [])

  useEffect(() => {
    reload()
    const sub = supabase
      .channel(`friends:${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, payload => {
        if (payload.eventType === 'DELETE') {
          // Deletes are not filtered per user, so only react to rows that are ours
          const id = (payload.old as { id?: number }).id
          if (id !== undefined && knownIds.current.has(id)) reload()
        } else {
          reload()
        }
      })
      .subscribe()
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => {
      supabase.removeChannel(sub)
      window.removeEventListener('focus', onFocus)
    }
  }, [myId, reload])

  const run = useCallback(
    async (call: Result): Promise<string | null> => {
      const { error } = await call
      await reload()
      return error ? error.message : null
    },
    [reload]
  )

  const friends = rows.filter(r => r.direction === 'friend')
  const incoming = rows.filter(r => r.direction === 'incoming')
  const outgoing = rows.filter(r => r.direction === 'outgoing')
  const blockedIds = useMemo(() => new Set(blocks.map(b => b.user_id)), [blocks])

  return {
    friends,
    incoming,
    outgoing,
    blocks,
    blockedIds,
    stateWith: (userId: string): FriendState => rows.find(r => r.other_id === userId)?.direction ?? 'none',
    addByUsername: (username: string) => run(supabase.rpc('send_friend_request_by_username', { uname: username })),
    addById: (userId: string) => run(supabase.rpc('send_friend_request', { target: userId })),
    accept: (friendshipId: number) => run(supabase.rpc('accept_friend_request', { fid: friendshipId })),
    remove: (friendshipId: number) => run(supabase.rpc('remove_friendship', { fid: friendshipId })),
    block: (userId: string) => run(supabase.rpc('block_user', { target: userId })),
    unblock: (userId: string) => run(supabase.rpc('unblock_user', { target: userId })),
  }
}

export type FriendsApi = ReturnType<typeof useFriends>