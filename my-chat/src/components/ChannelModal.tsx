import { useState } from 'react'
import { supabase } from '../supabase'
import Modal from './Modal'

type Props = {
  serverId: string
  onClose: () => void
  onDone: (channelId: string) => void
}

const kinds = {
  text: { icon: '#', title: 'Text', blurb: 'Send messages, links, and more' },
  voice: { icon: '🔊', title: 'Voice', blurb: 'Hang out with voice and screen sharing' },
} as const

export default function ChannelModal({ serverId, onClose, onDone }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'text' | 'voice'>('text')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError('')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_channel', {
      sid: serverId,
      channel_name: name,
      channel_kind: kind,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone(data as string)
  }

  return (
    <Modal
      title="Create channel"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-indigo-500 px-6 py-2.5 font-medium hover:bg-indigo-600 disabled:opacity-50"
          >
            {busy ? 'Creating...' : 'Create channel'}
          </button>
        </>
      }
    >
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-300">Channel type</span>
      <div className="mb-5 space-y-2">
        {(['text', 'voice'] as const).map(k => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left ${
              kind === k ? 'bg-white/10 ring-1 ring-indigo-400' : 'bg-[#2b2d31] hover:bg-[#35373c]'
            }`}
          >
            <span className="w-7 text-center text-2xl text-gray-300">{kinds[k].icon}</span>
            <span className="flex-1 leading-tight">
              <span className="block font-semibold text-white">{kinds[k].title}</span>
              <span className="block text-sm text-gray-400">{kinds[k].blurb}</span>
            </span>
            <span
              className={`h-5 w-5 rounded-full border-2 ${
                kind === k ? 'border-indigo-400 bg-indigo-400' : 'border-gray-500'
              }`}
            />
          </button>
        ))}
      </div>

      <label>
        <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-300">Channel name</span>
        <div className="flex items-center rounded-md bg-[#1e1f22] px-3">
          <span className="mr-2 text-gray-400">{kinds[kind].icon}</span>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={kind === 'text' ? 'new-channel' : 'hangout'}
            maxLength={30}
            className="flex-1 bg-transparent py-3 text-base outline-none placeholder:text-gray-500"
          />
        </div>
      </label>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Modal>
  )
}