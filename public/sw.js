/* eslint-disable no-undef */
/**
 * Service Worker —— 源文件，构建时由 scripts/stamp-sw.mjs 生成 public/sw.js（自动替换版本号）
 * 请勿直接修改 public/sw.js。
 *
 * 缓存策略：
 *  1. 页面导航        → 网络优先，断网时回退缓存的 index.html，再回退 offline.html
 *  2. JS / CSS / 图标 → 缓存优先（文件名带 hash，内容变了文件名也变）
 *  3. 点位图片        → 缓存优先 + 后台更新（看过的图自动缓存，第二次秒开）
 *  4. 其他同源请求    → 先缓存后网络（stale-while-revalidate）
 * 更新策略：
 *  新版本 SW 装好后停在 waiting，通知页面显示「发现新版本」，
 *  用户点击更新 → skipWaiting → 页面 reload，保证不会长期跑旧版本。
 */

const VERSION = '1790244263316-a277e09'
const CACHE_STATIC = 'd2-static-' + VERSION
/** 图片缓存用固定名字：图片文件名是稳定的，升级版本时不需要重新下载一遍 */
const CACHE_IMG = 'd2-img-v1'
const SCOPE = self.registration.scope
const abs = (u) => new URL(u, SCOPE).href
const INDEX_URL = abs('index.html')
const OFFLINE_URL = abs('offline.html')

const SHELL = ['', 'index.html', 'offline.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC)
      await Promise.allSettled(SHELL.map((p) => cache.add(new Request(abs(p), { cache: 'reload' }))))
      // 把 index.html 里引用的带 hash 的 JS/CSS 也抓进来，保证首次断网就能完全打开
      try {
        const res = await fetch(INDEX_URL, { cache: 'reload' })
        await cache.put(INDEX_URL, res.clone())
        const html = await res.text()
        const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map((m) => m[1])
          .filter((u) => !/^https?:/i.test(u) && /\.(js|css|png|webp|json|webmanifest)(\?|$)/i.test(u))
          .map(abs)
        await Promise.allSettled(urls.map((u) => cache.add(new Request(u, { cache: 'reload' }))))
      } catch (e) {
        /* 首次安装抓不到就算了，运行时缓存会补上 */
      }
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k.startsWith('d2-') && k !== CACHE_STATIC && k !== CACHE_IMG).map((k) => caches.delete(k))
      )
      await self.clients.claim()
      const clients = await self.clients.matchAll({ includeUncontrolled: true })
      clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: VERSION }))
    })()
  )
})

async function putIfOk(cacheName, request, response) {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  try {
    const res = await fetch(request)
    if (res && res.ok) {
      const cache = await caches.open(CACHE_STATIC)
      await cache.put(INDEX_URL, res.clone())
    }
    return res
  } catch (e) {
    const cached = (await caches.match(INDEX_URL)) || (await caches.match(OFFLINE_URL))
    if (cached) return cached
    return new Response('<h1>离线且没有缓存</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 })
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const res = await fetch(request)
  return putIfOk(cacheName, request, res)
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((res) => putIfOk(cacheName, request, res))
    .catch(() => null)
  return cached || (await network) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req))
    return
  }

  const path = url.pathname
  if (/\/images\//.test(path)) {
    event.respondWith(staleWhileRevalidate(req, CACHE_IMG))
    return
  }
  if (/\/assets\//.test(path) || /\.(png|webp|ico|svg|woff2?)$/.test(path) || /manifest\.webmanifest$/.test(path)) {
    event.respondWith(cacheFirst(req, CACHE_STATIC))
    return
  }
  event.respondWith(staleWhileRevalidate(req, CACHE_STATIC))
})

/* ------------------------------------------------------------------ */
/* 与页面通信                                                          */
/* ------------------------------------------------------------------ */

async function cacheAll(urls) {
  const cache = await caches.open(CACHE_IMG)
  const total = urls.length
  let done = 0
  let cached = 0
  let failed = 0
  const notify = (type) =>
    self.clients.matchAll({ includeUncontrolled: true }).then((cs) =>
      cs.forEach((c) => c.postMessage({ type, version: VERSION, total, done, cached, failed }))
    )

  await notify('CACHE_PROGRESS')
  for (const u of urls) {
    const target = abs(u)
    try {
      if (await cache.match(target)) {
        cached++
      } else {
        const res = await fetch(target, { cache: 'reload' })
        if (res && res.ok) {
          await cache.put(target, res.clone())
          cached++
        } else {
          failed++
        }
      }
    } catch (e) {
      failed++
    }
    done++
    if (done % 2 === 0 || done === total) await notify('CACHE_PROGRESS')
  }
  await notify('CACHE_ALL_DONE')
}

self.addEventListener('message', (event) => {
  const data = event.data || {}
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  if (data.type === 'GET_VERSION') {
    event.waitUntil(
      (async () => {
        const cs = await self.clients.matchAll({ includeUncontrolled: true })
        cs.forEach((c) => c.postMessage({ type: 'SW_VERSION', version: VERSION }))
      })()
    )
    return
  }
  if (data.type === 'CACHE_ALL' && Array.isArray(data.urls)) {
    event.waitUntil(cacheAll(data.urls))
    return
  }
  if (data.type === 'CACHE_STATS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_IMG)
        const keys = await cache.keys()
        event.source && event.source.postMessage({ type: 'CACHE_STATS', count: keys.length, version: VERSION })
      })()
    )
    return
  }
  if (data.type === 'CLEAR_OFFLINE') {
    event.waitUntil(
      (async () => {
        await caches.delete(CACHE_IMG)
        const cs = await self.clients.matchAll({ includeUncontrolled: true })
        cs.forEach((c) => c.postMessage({ type: 'CLEARED', version: VERSION }))
      })()
    )
  }
})
