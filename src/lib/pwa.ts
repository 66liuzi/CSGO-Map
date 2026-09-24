/**
 * PWA 相关：Service Worker 注册、更新提示、离线缓存控制、安装提示。
 * 全部封装在这里，界面只调用这几个函数。
 */

export interface OfflineProgress {
  total: number
  done: number
  cached: number
  failed: number
}

interface Handlers {
  onUpdateAvailable: (apply: () => void) => void
  onProgress: (p: OfflineProgress) => void
  onCacheAllDone: (p: OfflineProgress) => void
  onCleared: () => void
  onActivated: (version: string) => void
  onCacheStats?: (count: number) => void
}

let registration: ServiceWorkerRegistration | null = null
let reloading = false

export const swSupported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator

export function registerSW(handlers: Handlers): void {
  if (!swSupported()) return

  const base = import.meta.env.BASE_URL || './'

  const applyUpdate = () => {
    const waiting = registration?.waiting
    if (!waiting) {
      window.location.reload()
      return
    }
    reloading = true
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) window.location.reload()
    })
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {}
    switch (data.type) {
      case 'CACHE_PROGRESS':
        handlers.onProgress({ total: data.total, done: data.done, cached: data.cached, failed: data.failed })
        break
      case 'CACHE_ALL_DONE':
        handlers.onCacheAllDone({ total: data.total, done: data.done, cached: data.cached, failed: data.failed })
        break
      case 'CLEARED':
        handlers.onCleared()
        break
      case 'SW_ACTIVATED':
        handlers.onActivated(String(data.version || ''))
        break
      case 'CACHE_STATS':
        handlers.onCacheStats?.(Number(data.count || 0))
        break
    }
  })

  const start = () => {
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base, updateViaCache: 'none' })
      .then((reg) => {
        registration = reg

        if (reg.waiting && navigator.serviceWorker.controller) {
          handlers.onUpdateAvailable(applyUpdate)
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              handlers.onUpdateAvailable(applyUpdate)
            }
          })
        })

        // 联网时定期检查新版（GitHub 更新后能自动发现）
        const check = () => reg.update().catch(() => undefined)
        setInterval(check, 30 * 60 * 1000)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
        window.addEventListener('online', () => {
          check()
        })
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker 注册失败：', err)
      })
  }

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start)
}

function post(message: unknown): boolean {
  const sw = navigator.serviceWorker?.controller
  if (!sw) return false
  sw.postMessage(message)
  return true
}

/** 离线保存全部点位图片 */
export function cacheAllImages(urls: string[]): boolean {
  return post({ type: 'CACHE_ALL', urls })
}

/** 清除已缓存的离线图片 */
export function clearOfflineCache(): boolean {
  return post({ type: 'CLEAR_OFFLINE' })
}

/** 查询当前已缓存的图片数量 */
export function requestCacheStats(): boolean {
  return post({ type: 'CACHE_STATS' })
}

/** 当前是否处于离线状态 */
export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/* ------------------------------------------------------------------ */
/* 安装到主屏幕                                                        */
/* ------------------------------------------------------------------ */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const installListeners = new Set<(can: boolean) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    installListeners.forEach((fn) => fn(true))
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installListeners.forEach((fn) => fn(false))
  })
}

export function onInstallAvailability(fn: (can: boolean) => void): () => void {
  installListeners.add(fn)
  fn(!!deferredPrompt)
  return () => installListeners.delete(fn)
}

/** 是否已经是「添加到主屏幕」后的独立窗口模式 */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true)

export const isIOS = () =>
  typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)

/** 触发浏览器安装提示；返回是否真的弹了 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  await deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  installListeners.forEach((fn) => fn(false))
  return choice.outcome === 'accepted'
}
