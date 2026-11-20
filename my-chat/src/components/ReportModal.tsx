import { useState } from 'react'
import Modal from './Modal'

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

  async function submit() {
    setError('')
    setBusy(true)
    const err = await onSubmit(reason)
    setBusy(false)
    if (err) setError(err)
    else setDone(true)
  }

  return (
    <Modal
      title={title}
      subtitle={done ? undefined : 'Tell us what happened. Reports are reviewed by the people running this app.'}
      onClose={onClose}
      footer={
        done ? (
          <button onClick={onClose} className="rounded-md bg-indigo-500 px-6 py-2.5 font-medium hover:bg-indigo-600">
            Close
          </button>
        ) : (
          <>
            <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !reason.trim()}
              className="rounded-md bg-red-500 px-6 py-2.5 font-medium hover:bg-red-600 disabled:opacity-50"
            >
              {busy ? 'Sending...' : 'Send report'}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="py-4 text-center text-green-400">Thanks. Your report was sent and will be reviewed.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {quick.map(q => (
              <button
                key={q}
                onClick={() => setReason(q)}
                className={`rounded-full px-3.5 py-1.5 text-sm ${
                  reason === q ? 'bg-indigo-500' : 'bg-[#2b2d31] hover:bg-[#35373c]'
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
            className="w-full resize-none rounded-md bg-[#1e1f22] px-3 py-3 text-base outline-none placeholder:text-gray-500"
          />
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </>
      )}
    </Modal>
  )
}