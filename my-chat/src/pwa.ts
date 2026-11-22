import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { isElectron } from './notify'

const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

/* ---------- Service worker ---------- */

if (typeof window !== 'undefined' && !isElectron && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.error('Service worker failed', e))
  })
}

/* ---------- Install button ---------- */

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installEvent: InstallEvent | null = null
const installListeners = new Set<() => void>()
const emitInstall = () => installListeners.forEach(l => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    installEvent = e as InstallEvent
    emitInstall()
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    emitInstall()
  })
}

export function useCanInstall(): boolean {
  return useSyncExternalStore(
    cb => {
      installListeners.add(cb)
      return () => {
        installListeners.delete(cb)
      }
    },
    () => installEvent !== null,
    () => false
  )
}

export async function promptInstall() {
  const e = installEvent
  if (!e) return
  installEvent = null
  emitInstall()
  await e.prompt()
  await e.userChoice.catch(() => {})
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

export function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/* ---------- Badge on the app icon ---------- */

export function setAppBadge(count: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => {})
    else nav.clearAppBadge?.()?.catch(() => {})
  } catch {
    /* badges are optional */
  }
}

/* ---------- Push notifications (when the app is closed) ---------- */

export type PushState = 'unsupported' | 'not-configured' | 'needs-install' | 'blocked' | 'off' | 'on'

export function pushSupported(): boolean {
  return !isElectron && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function keyToBytes(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function readySubscription() {
  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The app is not ready yet.')), 8000)),
  ])
  return ready
}

async function saveSubscription(sub: PushSubscription): Promise<string | null> {
  const json = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_user_agent: navigator.userAgent.slice(0, 200),
  })
  return error ? error.message : null
}

export async function getPushState(): Promise<PushState> {
  if (isElectron) return 'unsupported'
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!pushSupported()) return 'unsupported'
  if (!VAPID_PUBLIC) return 'not-configured'
  if (Notification.permission === 'denied') return 'blocked'
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    return sub && Notification.permission === 'granted' ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

export async function enablePush(): Promise<string | null> {
  const state = await getPushState()
  if (state === 'needs-install')
    return 'On iPhone, add the app to your Home Screen first, then turn this on from inside that app.'
  if (state === 'unsupported') return "This browser can't receive push notifications."
  if (state === 'not-configured') return 'Push is not set up on the server yet.'
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted')
      return 'Notifications are blocked. Allow them in your browser or phone settings, then try again.'
    const reg = await readySubscription()
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(VAPID_PUBLIC) as BufferSource,
      })
    }
    return await saveSubscription(sub)
  } catch (e) {
    console.error(e)
    return 'Could not turn on push notifications.'
  }
}

export async function disablePush(): Promise<string | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint })
      await sub.unsubscribe()
    }
    return null
  } catch (e) {
    console.error(e)
    return 'Could not turn off push notifications.'
  }
}

// After signing in, link this device to the account that is now signed in
export async function resyncPush() {
  try {
    if (!pushSupported() || !VAPID_PUBLIC || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await saveSubscription(sub)
  } catch {
    /* push is optional */
  }
}

// Sign out without leaving this device attached to your account
export async function signOutCleanly() {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint })
    }
  } catch {
    /* sign out anyway */
  }
  await supabase.auth.signOut()
}