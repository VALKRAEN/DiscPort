self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

// Some browsers want a fetch handler before they offer to install the app. This one lets everything through.
self.addEventListener('fetch', () => {})

const UA = (self.navigator && self.navigator.userAgent) || ''
// Safari and every iPhone browser revoke push permission if a push does not show a notification
const STRICT = /iPhone|iPad|iPod|Macintosh/.test(UA) && !/Chrome|Chromium|Edg|Firefox|Android/.test(UA)

self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const looking = wins.some(w => w.visibilityState === 'visible' && w.focused)
      // When you're looking at the app it plays its own sound, so skip the banner (except where the browser insists)
      if (looking && !STRICT) return

      await self.registration.showNotification(data.title || 'My Chat', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || undefined,
        renotify: !!data.tag,
        silent: looking,
        data: data.data || {},
      })
    })()
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const data = event.notification.data || {}

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of wins) {
        if ('focus' in w) {
          try {
            await w.focus()
          } catch (e) {
            /* some browsers refuse, the message below still goes through */
          }
          w.postMessage({ type: 'notification-click', data })
          return
        }
      }
      let url = '/'
      if (data.kind === 'dm' && data.conversationId) url = '/?dm=' + encodeURIComponent(data.conversationId)
      else if (data.kind === 'friend') url = '/?friends=1'
      await self.clients.openWindow(url)
    })()
  )
})