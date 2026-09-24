import { useState } from 'react'
import { formatBytes } from '../lib/assets'

interface Props {
  totalImages: number
  totalBytes: number
  cacheCount: number
  progress: { total: number; done: number; cached: number; failed: number } | null
  saving: boolean
  onSaveAll: () => void
  onClear: () => void
  onShowInstall: () => void
  swReady: boolean
  version: string
}

export default function OfflineTools({
  totalImages,
  totalBytes,
  cacheCount,
  progress,
  saving,
  onSaveAll,
  onClear,
  onShowInstall,
  swReady,
  version,
}: Props) {
  const [open, setOpen] = useState(false)
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <section className="offline">
      <button className="offline-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>离线 & 安装</span>
        <span className="muted small">
          已缓存 {cacheCount}/{totalImages} 张图 · {open ? '收起' : '展开'}
        </span>
      </button>

      {open && (
        <div className="offline-body">
          <p className="muted small">
            缓存后即使网络差或短暂断网也能查点位：界面、搜索、已下载的准心图都可以离线使用。
            全部点位图约 {formatBytes(totalBytes)}，建议在 WiFi 下保存。
          </p>

          <div className="offline-actions">
            <button className="btn primary" onClick={onSaveAll} disabled={saving || !swReady}>
              {saving ? '正在保存…' : '离线保存全部点位'}
            </button>
            <button className="btn" onClick={onClear} disabled={!swReady}>
              清除离线数据
            </button>
            <button className="btn" onClick={onShowInstall}>
              添加到手机主屏幕
            </button>
          </div>

          {progress && (
            <div className="progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="muted small">
                {progress.done}/{progress.total}（{pct}%）· 已缓存 {progress.cached} 张
                {progress.failed > 0 && ` · 失败 ${progress.failed} 张`}
              </div>
            </div>
          )}

          {!swReady && <p className="muted small">离线功能不可用：当前环境没有 Service Worker（例如 https 未开启或浏览器不支持）。</p>}
          <p className="muted small">缓存版本：{version || '—'}</p>
        </div>
      )}
    </section>
  )
}
