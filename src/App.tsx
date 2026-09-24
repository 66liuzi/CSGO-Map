import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import lineupsJson from './data/lineups.json'
import imageSizesJson from './data/imageSizes.json'
import type { Lineup } from './data/types'
import { DEFAULT_FILTERS, allImageUrls, searchLineups, type Filters } from './lib/search'
import { assetUrl } from './lib/assets'
import {
  cacheAllImages,
  clearOfflineCache,
  isOffline,
  registerSW,
  requestCacheStats,
  swSupported,
} from './lib/pwa'
import { startVoice, voiceSupported } from './lib/voice'
import SearchBar from './components/SearchBar'
import FilterBar from './components/FilterBar'
import LineupCard from './components/LineupCard'
import LineupDetail from './components/LineupDetail'
import EmptyState from './components/EmptyState'
import InstallGuide from './components/InstallGuide'
import OfflineTools from './components/OfflineTools'
import Toast, { useToast } from './components/Toast'

const ALL = lineupsJson as unknown as Lineup[]
const IMAGE_STATS = imageSizesJson as { count: number; total: number }
const BASE = import.meta.env.BASE_URL || './'

const LS_SAMPLES = 'd2.hideSamples'
const SS_QUERY = 'd2.query'
const SS_SCROLL = 'd2.scroll'

function readUrlState(): { q: string; filters: Filters } {
  const params = new URLSearchParams(window.location.search)
  const side = params.get('side')
  const grenade = params.get('g')
  const zone = params.get('zone')
  return {
    q: params.get('q') ?? '',
    filters: {
      side: side === 'T' || side === 'CT' ? side : 'ALL',
      grenade: grenade === '烟雾弹' || grenade === '闪光弹' || grenade === '燃烧弹' || grenade === '手雷' ? grenade : 'ALL',
      zone: zone === 'A' || zone === 'MID' || zone === 'B' ? zone : 'ALL',
    },
  }
}

export default function App() {
  const initial = useMemo(readUrlState, [])
  const [query, setQuery] = useState(() => initial.q || sessionStorage.getItem(SS_QUERY) || '')
  const [filters, setFilters] = useState<Filters>(() => {
    const saved = sessionStorage.getItem('d2.filters')
    if (initial.filters.side !== 'ALL' || initial.filters.grenade !== 'ALL' || initial.filters.zone !== 'ALL') {
      return initial.filters
    }
    if (saved) {
      try {
        return { ...DEFAULT_FILTERS, ...(JSON.parse(saved) as Partial<Filters>) }
      } catch {
        /* 忽略损坏的缓存 */
      }
    }
    return DEFAULT_FILTERS
  })
  const [hideSamples, setHideSamples] = useState(() => localStorage.getItem(LS_SAMPLES) === '1')
  const [selected, setSelected] = useState<Lineup | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [offline, setOffline] = useState(isOffline())
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null)
  const [version, setVersion] = useState('')
  const [cacheCount, setCacheCount] = useState(0)
  const [progress, setProgress] = useState<{ total: number; done: number; cached: number; failed: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceHint, setVoiceHint] = useState<string | null>(null)
  const stopVoice = useRef<(() => void) | null>(null)
  const { items: toasts, push } = useToast()

  const sampleCount = useMemo(() => ALL.filter((l) => l.isSample).length, [])
  const pool = useMemo(() => (hideSamples ? ALL.filter((l) => !l.isSample) : ALL), [hideSamples])
  const result = useMemo(() => searchLineups(query, pool, filters), [query, pool, filters])
  const imageUrls = useMemo(() => allImageUrls(ALL, BASE), [])

  /* ---------------- Service Worker ---------------- */
  useEffect(() => {
    if (!swSupported()) return
    registerSW({
      onUpdateAvailable: (apply) => setApplyUpdate(() => apply),
      onProgress: (p) => setProgress(p),
      onCacheAllDone: (p) => {
        setSaving(false)
        setProgress(p)
        push(
          p.failed > 0
            ? `离线保存完成：成功 ${p.cached} 张，失败 ${p.failed} 张（可联网后重试）`
            : `离线保存完成：${p.cached} 张准心图已存到本机`,
          p.failed > 0 ? 'warn' : 'info'
        )
        requestCacheStats()
      },
      onCleared: () => {
        setCacheCount(0)
        setProgress(null)
        push('已清除离线数据，下次联网会自动重新缓存')
      },
      onActivated: (v) => {
        setVersion(v)
        requestCacheStats()
      },
      onCacheStats: (count) => setCacheCount(count),
    })
    // 已注册过的情况下也要拿到缓存统计
    window.setTimeout(() => requestCacheStats(), 1200)
  }, [push])

  /* ---------------- 在线 / 离线 ---------------- */
  useEffect(() => {
    const on = () => {
      setOffline(false)
      push('网络已恢复，正在检查最新点位…')
    }
    const off = () => {
      setOffline(true)
      push('已断网，正在使用离线数据', 'warn')
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [push])

  /* ---------------- 搜索词 / 筛选持久化 + 可分享链接 ---------------- */
  useEffect(() => {
    sessionStorage.setItem(SS_QUERY, query)
    sessionStorage.setItem('d2.filters', JSON.stringify(filters))
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (filters.side !== 'ALL') params.set('side', filters.side)
    if (filters.grenade !== 'ALL') params.set('g', filters.grenade)
    if (filters.zone !== 'ALL') params.set('zone', filters.zone)
    const search = params.toString()
    const url = `${window.location.pathname}${search ? `?${search}` : ''}`
    window.history.replaceState(window.history.state, '', url)
  }, [query, filters])

  useEffect(() => {
    localStorage.setItem(LS_SAMPLES, hideSamples ? '1' : '0')
  }, [hideSamples])

  /* ---------------- 滚动位置保留 ---------------- */
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        sessionStorage.setItem(SS_SCROLL, String(window.scrollY))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const saved = Number(sessionStorage.getItem(SS_SCROLL) || 0)
    if (saved > 0) window.requestAnimationFrame(() => window.scrollTo({ top: saved }))
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ---------------- 详情弹窗 + 返回键 ---------------- */
  const openDetail = useCallback((l: Lineup) => {
    setSelected(l)
    window.history.pushState({ ...(window.history.state || {}), d2detail: l.id }, '')
  }, [])

  const closeDetail = useCallback(() => {
    setSelected(null)
    if (window.history.state?.d2detail) window.history.back()
  }, [])

  useEffect(() => {
    const onPop = () => setSelected(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /* ---------------- 语音 ---------------- */
  const onMic = useCallback(() => {
    if (listening) {
      stopVoice.current?.()
      setListening(false)
      setVoiceHint(null)
      return
    }
    if (!voiceSupported()) {
      push('当前浏览器不支持网页语音输入。请点手机键盘上的麦克风键用键盘语音说话，识别出的文字同样能搜（离线也能搜）', 'warn', 5600)
      return
    }
    setVoiceHint('正在听… 例如「我在A大怎么封警家」')
    setListening(true)
    stopVoice.current = startVoice({
      onPartial: (t) => setQuery(t),
      onFinal: (t) => setQuery(t),
      onError: (kind, msg) => {
        setListening(false)
        setVoiceHint(null)
        if (kind === 'denied') push('麦克风权限被拒绝。请在浏览器设置中允许麦克风，或改用手机键盘的语音输入', 'warn', 5200)
        else if (kind === 'unsupported') push('当前浏览器不支持网页语音输入，请使用手机键盘自带的语音输入', 'warn', 5200)
        else if (kind === 'nospeech') push('没有听到声音，请再说一次', 'warn')
        else push(`语音识别失败（${msg ?? '未知原因'}），可以直接用键盘输入`, 'warn')
      },
      onEnd: () => {
        setListening(false)
        setVoiceHint(null)
      },
    })
  }, [listening, push])

  /* ---------------- 离线保存 / 清除 ---------------- */
  const saveAll = useCallback(() => {
    if (!navigator.onLine) {
      push('当前没有网络，联网后再点「离线保存全部点位」', 'warn')
      return
    }
    const ok = cacheAllImages(imageUrls)
    if (!ok) {
      push('离线缓存还没准备好（Service Worker 未激活），请刷新页面后重试', 'warn', 4200)
      return
    }
    setSaving(true)
    setProgress({ total: imageUrls.length, done: 0, cached: 0, failed: 0 })
  }, [imageUrls, push])

  const clearOffline = useCallback(() => {
    if (!clearOfflineCache()) {
      push('清除失败：Service Worker 未激活', 'warn')
      return
    }
    push('正在清除离线数据…')
  }, [push])

  const hasFilters = filters.side !== 'ALL' || filters.grenade !== 'ALL' || filters.zone !== 'ALL'
  const recognized = result.tokens.map((t) => t.canon).filter((v, i, a) => a.indexOf(v) === i)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            <img src={assetUrl('icons/favicon-32.png')} alt="" width={26} height={26} />
          </span>
          <div>
            <div className="brandtitle">CS2 炽热沙城 道具查询库</div>
            <div className="brandsub">Dust II · 一张准心图一条点位 · 搜索即出</div>
          </div>
        </div>
        <div className="topright">
          {offline && <span className="status offline">正在使用离线数据</span>}
          <button className="btn ghost" onClick={() => setShowInstall(true)}>
            安装到手机
          </button>
        </div>
      </header>

      <div className="searchzone">
        <SearchBar
          value={query}
          onChange={setQuery}
          onMicClick={onMic}
          listening={listening}
          hint={voiceHint}
        />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          hideSamples={hideSamples}
          onToggleSamples={setHideSamples}
          sampleCount={sampleCount}
        />
      </div>

      <main className="main">
        <div className="resultbar">
          <span>
            {query ? (
              <>
                找到 <b>{result.items.length}</b> 条
                {recognized.length > 0 && <span className="muted"> · 关键词：{recognized.join(' · ')}</span>}
              </>
            ) : (
              <>
                共 <b>{result.items.length}</b> 条点位
                <span className="muted"> · 直接输入或按麦克风说话</span>
              </>
            )}
          </span>
          <span className="muted small">{ALL.length} 条点位 · {imageUrls.length} 个图片文件</span>
        </div>

        {result.items.length > 0 ? (
          <div className="grid">
            {result.items.map((hit) => (
              <LineupCard key={hit.lineup.id} lineup={hit.lineup} onOpen={openDetail} />
            ))}
          </div>
        ) : (
          <EmptyState
            suggestions={result.suggestions}
            onPick={setQuery}
            onClearFilters={() => setFilters(DEFAULT_FILTERS)}
            hasFilters={hasFilters}
            query={query}
          />
        )}
      </main>

      <footer className="footer">
        <OfflineTools
          totalImages={imageUrls.length}
          totalBytes={IMAGE_STATS.total}
          cacheCount={cacheCount}
          progress={progress}
          saving={saving}
          onSaveAll={saveAll}
          onClear={clearOffline}
          onShowInstall={() => setShowInstall(true)}
          swReady={swSupported()}
          version={version}
        />
        <p className="muted small footernote">
          纯静态站点：点位数据与准心图都存在 GitHub 仓库里，没有数据库、没有后台、不用开电脑。
          <br />
          新增点位由 AI 收到「一张准心图 + 一句说明」后自动整理、提交并发布。
        </p>
      </footer>

      {applyUpdate && (
        <div className="updatebar">
          <span>发现新版本（含最新点位）</span>
          <button
            className="btn primary small"
            onClick={() => {
              applyUpdate()
            }}
          >
            立即更新
          </button>
          <button className="iconbtn" onClick={() => setApplyUpdate(null)} aria-label="稍后">
            ✕
          </button>
        </div>
      )}

      <LineupDetail lineup={selected} onClose={closeDetail} />
      <InstallGuide open={showInstall} onClose={() => setShowInstall(false)} onToast={push} />
      <Toast items={toasts} />
    </div>
  )
}
