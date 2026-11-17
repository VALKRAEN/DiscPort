import { useState } from 'react'
import { supabase } from '../supabase'

const colors = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
]

type Props = {
  onClose: () => void
  onDone: (serverId: string) => void
}

export default function ServerModal({ onClose, onDone }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError('')
    setBusy(true)
    const result =
      tab === 'create'
        ? await supabase.rpc('create_server', {
            server_name: name,
            server_color: colors[Math.floor(Math.random() * colors.length)],
          })
        : await supabase.rpc('join_server', { code })
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    onDone(result.data as string)
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm bg-[#313338] text-gray-100 rounded-lg p-6 space-y-4">
        <div className="flex gap-2">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setError('')
              }}
              className={`flex-1 rounded py-2 text-sm font-semibold ${
                tab === t ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {t === 'create' ? 'Create a server' : 'Join a server'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Server name"
            maxLength={50}
            className="w-full rounded bg-[#1e1f22] px-3 py-2 outline-none"
          />
        ) : (
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Invite code"
            className="w-full rounded bg-[#1e1f22] px-3 py-2 outline-none"
          />
        )}

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
            {busy ? 'Please wait...' : tab === 'create' ? 'Create' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  )
}