import { Fragment, useState, useRef, useEffect } from 'react'
import type { Channel, Message, Member } from '../types'
import { colorFor } from '../colors'
import { rank } from '../roles'

type Props = {
  channel: Channel
  messages: Message[]
  members: Member[]
  myId: string
  myRank: number
  onSend: (text: string) => Promise<string | null>
  onDelete: (id: number) => Promise<string | null>
  onSelectMember: (id: string) => void
}

const GROUP_WINDOW_MS = 5 * 60 * 1000

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function dayKey(iso: string) {
  return new Date(iso).toDateString()
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ChatArea({
  channel,
  messages,
  members,
  myId,
  myRank,
  onSend,
  onDelete,
  onSelectMember,
}: Props) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, channel.id])

  const memberOf = (userId: string) => members.find(m => m.id === userId)

  async function submit() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setError('')
    const err = await onSend(text)
    if (err) {
      setError(err)
      setDraft(text)
    }
  }

  async function remove(id: number) {
    setError('')
    const err = await onDelete(id)
    if (err) setError(err)
  }

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <header className="h-12 border-b border-black/20 px-4 flex items-center font-semibold">
        # {channel.name}
      </header>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && <p className="px-4 text-gray-400">No messages yet. Say something!</p>}

        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at)
          const grouped =
            !newDay &&
            prev.user_id === m.user_id &&
            new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS

          const member = memberOf(m.user_id)
          const name = member?.display_name ?? 'Unknown user'
          const authorRank = member ? rank[member.role] : 0
          const canDelete = m.user_id === myId || (myRank >= 2 && myRank > authorRank)

          const deleteButton = canDelete && (
            <button
              onClick={() => remove(m.id)}
              title="Delete message"
              className="absolute right-4 top-0 hidden rounded bg-[#2b2d31] px-2 py-0.5 text-xs text-red-400 shadow hover:bg-red-500 hover:text-white group-hover:block"
            >
              Delete
            </button>
          )

          return (
            <Fragment key={m.id}>
              {newDay && (
                <div className="flex items-center gap-3 px-4 my-4 text-xs font-semibold text-gray-400">
                  <div className="flex-1 border-t border-white/10" />
                  {dayLabel(m.created_at)}
                  <div className="flex-1 border-t border-white/10" />
                </div>
              )}

              {grouped ? (
                <div className="group relative flex px-4 py-0.5 hover:bg-black/10">
                  <span className="absolute left-4 w-10 pt-1 text-center text-[10px] text-gray-500 opacity-0 group-hover:opacity-100">
                    {formatTime(m.created_at)}
                  </span>
                  <p className="ml-[52px] break-words whitespace-pre-wrap min-w-0">{m.content}</p>
                  {deleteButton}
                </div>
              ) : (
                <div className="group relative flex gap-3 px-4 pt-3 pb-0.5 hover:bg-black/10">
                  <button
                    onClick={() => member && onSelectMember(member.id)}
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${
                      member ? colorFor(member.id) : 'bg-gray-600'
                    }`}
                  >
                    {name[0]?.toUpperCase()}
                  </button>
                  <div className="min-w-0">
                    <div className="leading-tight">
                      <button
                        onClick={() => member && onSelectMember(member.id)}
                        className="font-semibold hover:underline"
                      >
                        {name}
                      </button>
                      <span className="ml-2 text-xs text-gray-400">{formatTime(m.created_at)}</span>
                    </div>
                    <p className="break-words whitespace-pre-wrap">{m.content}</p>
                  </div>
                  {deleteButton}
                </div>
              )}
            </Fragment>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4">
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={2000}
          className="w-full rounded-lg bg-[#383a40] px-4 py-3 outline-none"
          placeholder={`Message #${channel.name}`}
        />
      </div>
    </main>
  )
}