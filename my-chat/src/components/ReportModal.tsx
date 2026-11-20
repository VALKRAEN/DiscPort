import { useEffect, useState } from 'react'

type Props = {
  title: string
  onSubmit: (reason: string) => Promise<string | null>
  onClose: () => void
}

const quick = ['Harassment or bullying', 'Spam', 'Inappropriate or explicit content', 'Threats or self-harm', 'Other']

export default function ReportModal({ title, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    setError('')
    setBusy(true)
    const err = await onSubmit(reason)
    setBusy(false)
    if (err) setError(err)
    else setDone(true)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm space-y-4 rounded-lg bg-[#313338] p-6 text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{title}</h2>

        {done ? (
          <>
            <p className="text-sm text-green-400">Thanks. Your report was sent and will be reviewed.</p>
            <button onClick={onClose} className="w-full rounded bg-indigo-500 py-2 font-semibold hover:bg-indigo-600">
              Close
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {quick.map(q => (
                <button
                  key={q}
                  onClick={() => setReason(q)}
                  className={`rounded px-3 py-1.5 text-xs ${
                    reason === q ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="What's wrong? Add any details that help."
              className="w-full resize-none rounded bg-[#1e1f22] px-3 py-2 outline-none"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded bg-white/10 py-2 hover:bg-white/20">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || !reason.trim()}
                className="flex-1 rounded bg-red-500 py-2 font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                {busy ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}