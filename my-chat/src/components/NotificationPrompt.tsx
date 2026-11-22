import { useState } from 'react'
import { enablePush } from '../pwa'
import { notificationPermission, notificationsSupported, requestNotificationPermission } from '../notify'

const DISMISS_KEY = 'mychat.notify.dismissed'

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export default function NotificationPrompt() {
  const [hidden, setHidden] = useState(wasDismissed)
  const [busy, setBusy] = useState(false)

  if (hidden || !notificationsSupported() || notificationPermission() !== 'default') return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* fine */
    }
    setHidden(true)
  }

  async function turnOn() {
    setBusy(true)
    const result = await requestNotificationPermission()
    if (result === 'granted') await enablePush() // best effort: also turns on push where it is available
    setBusy(false)
    setHidden(true)
  }

  return (
    <div className="flex shrink-0 items-center gap-3 bg-[#232428] px-4 py-2.5 text-sm shadow-[0_1px_0_rgba(0,0,0,0.25)]">
      <span className="text-lg">🔔</span>
      <span className="min-w-0 flex-1 text-gray-200">Get notified about new messages and friend requests.</span>
      <button
        onClick={turnOn}
        disabled={busy}
        className="rounded-md bg-indigo-500 px-3 py-1.5 font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
      >
        Turn on
      </button>
      <button onClick={dismiss} className="rounded-md px-2 py-1.5 text-gray-400 hover:text-white">
        Not now
      </button>
    </div>
  )
}