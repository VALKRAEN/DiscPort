import { useState } from 'react'
import { supabase } from '../supabase'

type Props = {
  serverId: string
  onClose: () => void
  onDone: (channelId: string) => void
}

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
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm bg-[#313338] text-gray-100 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold">Create channel</h2>

        <div className="flex gap-2">
          {(['text', 'voice'] as const).map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded py-2 text-sm font-semibold ${
                kind === k ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {k === 'text' ? '# Text' : '🔊 Voice'}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded bg-[#1e1f22] px-3 py-2">
          <span className="text-gray-400 mr-2">{kind === 'text' ? '#' : '🔊'}</span>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={kind === 'text' ? 'new-channel' : 'hangout'}
            maxLength={30}
            className="flex-1 bg-transparent outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded bg-white/10 hover:bg-white/20 py-2">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 py-2 font-semibold"
          >
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}