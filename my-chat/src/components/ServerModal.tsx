import { useState } from 'react'
import { supabase } from '../supabase'
import Modal from './Modal'

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

  const label = 'mb-2 block text-xs font-bold uppercase tracking-wide text-gray-300'
  const input = 'w-full rounded-md bg-[#1e1f22] px-3 py-3 text-base outline-none placeholder:text-gray-500'

  return (
    <Modal
      title={tab === 'create' ? 'Create your server' : 'Join a server'}
      subtitle={
        tab === 'create'
          ? 'Your server is where you and your friends hang out. Make yours and start talking.'
          : 'Enter an invite code to join an existing server.'
      }
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
            {busy ? 'Please wait...' : tab === 'create' ? 'Create server' : 'Join server'}
          </button>
        </>
      }
    >
      <div className="mb-5 flex rounded-lg bg-[#1e1f22] p-1">
        {(['create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setError('')
            }}
            className={`flex-1 rounded-md py-2 text-sm font-semibold ${
              tab === t ? 'bg-[#404249] text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t === 'create' ? 'Create' : 'Join'}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <label>
          <span className={label}>Server name</span>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="My awesome server"
            maxLength={50}
            className={input}
          />
        </label>
      ) : (
        <label>
          <span className={label}>Invite code</span>
          <input
            autoFocus
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="a1b2c3d4"
            className={input}
          />
        </label>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Modal>
  )
}