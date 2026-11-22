import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  isElectron,
  notificationPermission,
  requestNotificationPermission,
  showLocalNotification,
  updateNotifyPrefs,
  useNotifyPrefs,
} from '../notify'
import { disablePush, enablePush, getPushState, isIos, isStandalone, promptInstall, useCanInstall } from '../pwa'
import type { PushState } from '../pwa'

const card = 'mb-6 rounded-xl bg-[#2b2d31] p-5'
const heading = 'mb-2 block text-xs font-bold uppercase tracking-wide text-gray-300'

function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        on ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  )
}

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-white">{title}</div>
        {desc && <div className="text-sm text-gray-400">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

export default function NotificationSettings() {
  const prefs = useNotifyPrefs()
  const canInstall = useCanInstall()
  const [perm, setPerm] = useState(notificationPermission())
  const [push, setPush] = useState<PushState | 'checking'>('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const refresh = useCallback(async () => {
    setPerm(notificationPermission())
    setPush(await getPushState())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function allow() {
    setError('')
    setInfo('')
    setBusy(true)
    const r = await requestNotificationPermission()
    setBusy(false)
    if (r === 'denied') setError('Notifications are blocked. Allow them in your browser or phone settings for this site.')
    await refresh()
  }

  async function togglePush(on: boolean) {
    setError('')
    setInfo('')
    setBusy(true)
    const err = on ? await enablePush() : await disablePush()
    setBusy(false)
    if (err) setError(err)
    await refresh()
  }

  async function test() {
    setError('')
    setInfo('')
    const ok = await showLocalNotification({
      title: 'My Chat',
      body: 'Notifications are working.',
      tag: 'test',
      data: { kind: 'test' },
    })
    if (ok) setInfo('Test notification sent.')
    else setError('Could not show a notification. Check that notifications are allowed for this site.')
  }

  const iosSteps = (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-300">
      <li>Open this site in Safari.</li>
      <li>Tap the Share button, then Add to Home Screen.</li>
      <li>Open My Chat from your Home Screen, then come back to this page and turn push on.</li>
    </ol>
  )

  return (
    <>
      {error && <p className="mb-4 rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {info && <p className="mb-4 rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-400">{info}</p>}

      <section className={card}>
        <h3 className={heading}>Notifications on this device</h3>

        {perm === 'unsupported' && (
          <p className="text-sm text-gray-400">
            {isIos() && !isStandalone()
              ? 'iPhone and iPad only allow notifications for apps added to the Home Screen. See "Get the app" below.'
              : "This browser doesn't support notifications."}
          </p>
        )}

        {perm === 'denied' && (
          <p className="text-sm text-gray-400">
            Notifications are blocked for this site. Allow them in your browser's site settings (the lock icon in the
            address bar) or in your phone's settings, then come back.
          </p>
        )}

        {perm === 'default' && (
          <div className="flex items-center gap-4">
            <p className="flex-1 text-sm text-gray-300">Allow notifications to get a banner when someone messages you.</p>
            <button
              onClick={allow}
              disabled={busy}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              Allow notifications
            </button>
          </div>
        )}

        {perm === 'granted' && (
          <>
            <Row title="Show notifications" desc="Banners appear when you're in another window or tab.">
              <Switch on={prefs.enabled} onChange={v => updateNotifyPrefs({ enabled: v })} />
            </Row>
            <div className={`border-t border-white/10 ${prefs.enabled ? '' : 'pointer-events-none opacity-40'}`}>
              <Row title="Direct messages">
                <Switch on={prefs.dm} onChange={v => updateNotifyPrefs({ dm: v })} />
              </Row>
              <Row title="Friend requests">
                <Switch on={prefs.friend} onChange={v => updateNotifyPrefs({ friend: v })} />
              </Row>
              <Row title="Messages in the channel you have open">
                <Switch on={prefs.channel} onChange={v => updateNotifyPrefs({ channel: v })} />
              </Row>
            </div>
            <button
              onClick={test}
              className="mt-3 rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Send a test notification
            </button>
          </>
        )}
      </section>

      <section className={card}>
        <h3 className={heading}>Push notifications (when the app is closed)</h3>
        {push === 'checking' && <p className="text-sm text-gray-400">Checking...</p>}

        {push === 'unsupported' && (
          <p className="text-sm text-gray-400">
            {isElectron
              ? 'The desktop app shows notifications while it is running. To be notified while it is closed, install My Chat on your phone and turn push on there.'
              : "This browser can't receive push notifications."}
          </p>
        )}
        {push === 'not-configured' && (
          <p className="text-sm text-gray-400">Push isn't set up on the server yet. Ask whoever runs this app.</p>
        )}
        {push === 'needs-install' && (
          <>
            <p className="mb-3 text-sm text-gray-400">On iPhone, push only works from an app on your Home Screen.</p>
            {iosSteps}
          </>
        )}
        {push === 'blocked' && (
          <p className="text-sm text-gray-400">
            Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.
          </p>
        )}
        {(push === 'off' || push === 'on') && (
          <Row title="Push on this device" desc="Get direct messages and friend requests even when the app is closed.">
            <Switch on={push === 'on'} disabled={busy} onChange={togglePush} />
          </Row>
        )}
      </section>

      <section className={card}>
        <h3 className={heading}>Get the app</h3>
        {isElectron ? (
          <p className="text-sm text-gray-400">You're using the desktop app.</p>
        ) : isStandalone() ? (
          <p className="text-sm text-green-400">✓ You're using the installed app.</p>
        ) : canInstall ? (
          <div className="flex items-center gap-4">
            <p className="flex-1 text-sm text-gray-300">Add My Chat to your home screen or desktop as an app.</p>
            <button
              onClick={() => promptInstall()}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Install app
            </button>
          </div>
        ) : isIos() ? (
          iosSteps
        ) : (
          <p className="text-sm text-gray-400">
            Open your browser's menu and choose Install app (or Add to Home screen).
          </p>
        )}
      </section>
    </>
  )
}