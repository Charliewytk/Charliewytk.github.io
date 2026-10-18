// Side A offline: keeps the record, the tracklist and every track page so the site opens without a signal.
// Pages are fetched fresh first and fall back to the copy kept here; files are served from here and refreshed behind.
var VERSION = 'side-a-v1';
var SCOPE = self.registration.scope;
var TRACKS = ['exetix', 'research', 'solana', 'merger-monitor', 'doorly', 'powerleash', 'abyss-warden',
  'deskstatus', 'numerai', 'competitions', 'chess-exchange', 'chelsea-bikes'];
var THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
var KEEP = ['', 'tracks/', 'tracks/track.css', 'offline.html', 'media/favicon.svg', 'manifest.webmanifest']
  .concat(TRACKS.map(function (t) { return 'tracks/' + t + '/'; }))
  .map(function (p) { return new URL(p, SCOPE).href; })
  .concat([THREE]);

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // one missing file must not stop the rest from being kept
    return Promise.all(KEEP.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('side-a-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function keep(req, res) {
  if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
    var copy = res.clone();
    caches.open(VERSION).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var own = url.origin === location.origin;
  if (!own && req.url !== THREE) return;
  // audio and video are large and streamed in pieces; the live research feed must stay live
  if (/\.(m4a|mp3|mp4|webm|mov)$/i.test(url.pathname) || /\.json$/i.test(url.pathname)) return;

  // pages (opened directly, or fetched by Side A to open a track in place): fresh first
  if (req.mode === 'navigate' || (own && (/\/$|\.html$/.test(url.pathname)))) {
    e.respondWith(fetch(req).then(function (res) { return keep(req, res); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match(new URL('offline.html', SCOPE).href) : Response.error());
      });
    }));
    return;
  }
  // everything else of the site's own is left to the browser, except the record's files
  if (own && !/^(tracks|media|manifest\.webmanifest)/.test(url.href.slice(SCOPE.length))) return;

  e.respondWith(caches.match(req).then(function (hit) {
    var fresh = fetch(req).then(function (res) { return keep(req, res); });
    if (hit) { e.waitUntil(fresh.catch(function () {})); return hit; }
    return fresh;
  }));
});
