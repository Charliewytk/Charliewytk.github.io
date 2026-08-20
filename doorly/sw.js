// Doorly service worker: makes the installed app open instantly and survive
// flaky connections. Static assets are cached; API responses are not (stale
// flight prices are worse than no flight prices — the client has its own
// clearly-labelled demo fallback).

const CACHE = 'doorly-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg', '/manifest.webmanifest'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return // always live

  // Hashed build assets: cache-first (immutable by name)
  if (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(png|svg|webmanifest)$/)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
        }
        return res
      })),
    )
    return
  }

  // Navigations: network-first with cached shell fallback (offline open)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
        }
        return res
      }).catch(() => caches.match('/')),
    )
  }
})
