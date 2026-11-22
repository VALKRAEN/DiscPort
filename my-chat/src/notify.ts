import { useSyncExternalStore } from 'react'

export type NotifyPrefs = { enabled: boolean; dm: boolean; friend: boolean; channel: boolean }
export type NotifyKind = 'dm' | 'friend' | 'channel'
export type NotifyData =
  | { kind: 'dm'; conversationId: string }
  | { kind: 'friend' }
  | { kind: 'channel' }
  | { kind: 'test' }

export const isElectron = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)

const KEY = 'mychat.notify'
const DEFAULTS: NotifyPrefs = { enabled: true, dm: true, friend: true, channel: true }

function load(): NotifyPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}
    return {
      enabled: raw.enabled !== false,
      dm: raw.dm !== false,
      friend: raw.friend !== false,
      channel: raw.channel !== false,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

let current = load()
const listeners = new Set<() => void>()

export function getNotifyPrefs(): NotifyPrefs {
  return current
}

export function updateNotifyPrefs(patch: Partial<NotifyPrefs>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* storage is blocked, so the setting just won't be remembered */
  }
  listeners.forEach(l => l())
}

export function useNotifyPrefs(): NotifyPrefs {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    getNotifyPrefs,
    getNotifyPrefs
  )
}

export function shouldNotify(kind: NotifyKind): boolean {
  return current.enabled && current[kind]
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

type NotifyOptions = { title: string; body: string; tag?: string; data?: NotifyData }

// Shows a banner on this device. Returns false if it could not.
export async function showLocalNotification(opts: NotifyOptions, onClick?: () => void): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false

  // Phones need the service worker to show notifications; the desktop app uses the plain kind
  if (!isElectron && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(opts.title, {
          body: opts.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: opts.tag,
          data: opts.data ?? {},
        })
        return true
      }
    } catch {
      /* fall through to the plain notification */
    }
  }

  try {
    const n = new Notification(opts.title, { body: opts.body, icon: '/icon-192.png', tag: opts.tag })
    n.onclick = () => {
      window.focus()
      onClick?.()
      n.close()
    }
    return true
  } catch {
    return false
  }
}