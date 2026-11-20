import { Fragment, useState, useRef, useEffect } from 'react'
import type { Message, Member } from '../types'
import { rank } from '../roles'
import Avatar from './Avatar'

type Props = {
  resetKey: string // changes when you open a different channel or conversation
  title: string
  placeholder: string
  messages: Message[]
  members: Member[]
  myId: string
  myRank: number
  onSend: (text: string) => Promise<string | null>
  onDelete: (id: number) => Promise<string | null>
  onReport?: (messageId: number) => void
  onSelectMember: (id: string) => void
  onOpenNav: () => void
  onOpenMembers: () => void
  hideMembers?: boolean
  navBadge?: number // unread DMs and requests, shown on the menu button on phones
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
  resetKey,
  title,
  placeholder,
  messages,
  members,
  myId,
  myRank,
  onSend,
  onDelete,
  onReport,
  onSelectMember,
  onOpenNav,
  onOpenMembers,
  hideMembers = false,
  navBadge = 0,
}: Props) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, resetKey])

  useEffect(() => {
    setSelectedId(null)
  }, [resetKey])

  const memberOf = (userId: string) => members.find(m => m.id === userId)

  // On touch screens there is no hover, so tapping a message reveals its actions
  function tapMessage(id: number) {
    if (window.matchMedia('(hover: none)').matches) {
      setSelectedId(prev => (prev === id ? null : id))
    }
  }

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
    setSelectedId(null)
    const err = await onDelete(id)
    if (err) setError(err)
  }

  const actionBtn = 'rounded bg-[#2b2d31] px-3 py-1.5 text-sm shadow md:px-2 md:py-0.5 md:text-xs'

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-black/20 px-2 font-semibold md:px-4">
        <button
          onClick={onOpenNav}
          title="Servers and channels"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded text-xl hover:bg-white/10 md:hidden"
        >
          ☰
          {navBadge > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
        </button>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {!hideMembers && (
          <button
            onClick={onOpenMembers}
            title="Members"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-xl hover:bg-white/10 lg:hidden"
          >
            👥
          </button>
        )}
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
          const canReport = !!onReport && m.user_id !== myId
          const selected = selectedId === m.id

          const deleteButton = (canDelete || canReport) && (
            <div
              className={`absolute right-2 top-0 gap-1 md:right-4 ${selected ? 'flex' : 'hidden group-hover:flex'}`}
            >
              {canReport && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setSelectedId(null)
                    onReport?.(m.id)
                  }}
                  title="Report message"
                  className={`${actionBtn} text-gray-300 hover:bg-white/20`}
                >
                  Report
                </button>
              )}
              {canDelete && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    remove(m.id)
                  }}
                  title="Delete message"
                  className={`${actionBtn} text-red-400 hover:bg-red-500 hover:text-white`}
                >
                  Delete
                </button>
              )}
            </div>
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
                <div
                  onClick={() => tapMessage(m.id)}
                  className={`group relative flex px-4 py-0.5 hover:bg-black/10 ${selected ? 'bg-black/20' : ''}`}
                >
                  <span
                    className={`absolute left-4 w-10 pt-1 text-center text-[10px] text-gray-500 ${
                      selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {formatTime(m.created_at)}
                  </span>
                  <p className="ml-[52px] min-w-0 whitespace-pre-wrap break-words">{m.content}</p>
                  {deleteButton}
                </div>
              ) : (
                <div
                  onClick={() => tapMessage(m.id)}
                  className={`group relative flex gap-3 px-4 pt-3 pb-0.5 hover:bg-black/10 ${
                    selected ? 'bg-black/20' : ''
                  }`}
                >
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (member) onSelectMember(member.id)
                    }}
                    className="shrink-0 rounded-full"
                  >
                    <Avatar id={m.user_id} name={name} path={member?.avatar_path} size={40} />
                  </button>
                  <div className="min-w-0">
                    <div className="leading-tight">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (member) onSelectMember(member.id)
                        }}
                        className="font-semibold hover:underline"
                      >
                        {name}
                      </button>
                      <span className="ml-2 text-xs text-gray-400">{formatTime(m.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                  {deleteButton}
                </div>
              )}
            </Fragment>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 md:p-4">
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          enterKeyHint="send"
          maxLength={2000}
          className="w-full rounded-lg bg-[#383a40] px-4 py-3 outline-none"
          placeholder={placeholder}
        />
      </div>
    </main>
  )
}