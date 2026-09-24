import { useCallback, useEffect, useRef, useState } from 'react'
import { assetUrl } from '../lib/assets'
import type { Lineup } from '../data/types'
import { GRENADE_SHORT, lineupTitle, ZONE_LABEL } from '../data/types'
import { mapFullName } from '../data/maps'

interface Props {
  lineup: Lineup | null
  onClose: () => void
}

/**
 * 准心大图：支持手机双指缩放 / 拖动 / 双击放大，桌面端支持滚轮与按钮缩放。
 * 缩放只作用在图片上，关闭按钮固定在右上角，永远好点。
 */
function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const boxRef = useRef<HTMLDivElement>(null)
  const state = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    startDist: 0,
    startScale: 1,
    lastTap: 0,
    startOffset: { x: 0, y: 0 },
    startCenter: { x: 0, y: 0 },
  })

  const reset = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    reset()
  }, [src, reset])

  const clampScale = (s: number) => Math.min(6, Math.max(1, s))

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const st = state.current
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (st.pointers.size === 1) {
      const now = Date.now()
      if (now - st.lastTap < 300) {
        setScale((prev) => (prev > 1 ? 1 : 2.5))
        setOffset({ x: 0, y: 0 })
        st.lastTap = 0
      } else {
        st.lastTap = now
      }
      st.startOffset = offset
      st.startCenter = { x: e.clientX, y: e.clientY }
    } else if (st.pointers.size === 2) {
      const pts = [...st.pointers.values()]
      st.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      st.startScale = scale
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const st = state.current
    if (!st.pointers.has(e.pointerId)) return
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (st.pointers.size >= 2) {
      const pts = [...st.pointers.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (st.startDist > 0) {
        setScale(clampScale((st.startScale * dist) / st.startDist))
      }
      return
    }

    if (scale > 1) {
      setOffset({
        x: st.startOffset.x + (e.clientX - st.startCenter.x),
        y: st.startOffset.y + (e.clientY - st.startCenter.y),
      })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const st = state.current
    st.pointers.delete(e.pointerId)
    if (st.pointers.size < 2) st.startDist = 0
    if (st.pointers.size === 1) {
      const rest = [...st.pointers.values()][0]
      st.startOffset = offset
      st.startCenter = { x: rest.x, y: rest.y }
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale((s) => clampScale(s - e.deltaY * 0.0025))
  }

  return (
    <div className="zoomarea">
      <div
        ref={boxRef}
        className={`zoomimg${scale > 1 ? ' zoomed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={() => (scale > 1 ? reset() : setScale(2.5))}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}
        />
      </div>
      <div className="zoombar">
        <button onClick={() => setScale((s) => clampScale(s - 0.5))} aria-label="缩小">
          −
        </button>
        <span className="zoomval">{scale.toFixed(1)}×</span>
        <button onClick={() => setScale((s) => clampScale(s + 0.5))} aria-label="放大">
          ＋
        </button>
        <button onClick={reset} aria-label="还原">
          还原
        </button>
      </div>
      <div className="zoomtip">双指缩放 / 拖动查看准心细节，双击可放大还原</div>
    </div>
  )
}

export default function LineupDetail({ lineup, onClose }: Props) {
  useEffect(() => {
    if (!lineup) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [lineup, onClose])

  if (!lineup) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={lineupTitle(lineup)}>
      <div className="modalbackdrop" onClick={onClose} />
      <div className="modalpanel">
        <div className="modalhead">
          <div className="modaltitle">
            <h2>{lineupTitle(lineup)}</h2>
            <div className="metarow">
              <span className="badge map">{mapFullName(lineup.map)}</span>
              <span className={`badge side-${lineup.side.toLowerCase()}`}>{lineup.side} 方</span>
              <span className="badge method">{lineup.grenadeType}</span>
              <span className="badge method">{lineup.throwMethod}</span>
              <span className="badge method">{ZONE_LABEL[lineup.zone]}</span>
              {lineup.isSample && <span className="flag sample">示例占位图</span>}
              {lineup.needsReview && <span className="flag review">待人工确认</span>}
            </div>
          </div>
          <button className="closebtn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <ZoomImage src={assetUrl(lineup.image)} alt={`${lineupTitle(lineup)} 准心瞄点图`} />

        <dl className="detail">
          {lineup.needsReview && (
            <div className="wide reviewnote">
              <dt>待确认</dt>
              <dd>
                这条是 AI 从你给的一句话里自动提取的，可能有推断成分。看完图觉得有哪里不对（阵营 / 起点 / 目标 / 投法），
                直接把正确说法告诉 AI，它会改掉这条并把标记去掉。
              </dd>
            </div>
          )}
          <div>
            <dt>起始位置</dt>
            <dd>{lineup.startLocation}</dd>
          </div>
          <div>
            <dt>投掷目标</dt>
            <dd>{lineup.targetLocation}</dd>
          </div>
          <div>
            <dt>道具</dt>
            <dd>
              {lineup.grenadeType}
              <span className="muted">（{GRENADE_SHORT[lineup.grenadeType]}）</span>
            </dd>
          </div>
          <div>
            <dt>投法</dt>
            <dd>{lineup.throwMethod}</dd>
          </div>
          <div className="wide">
            <dt>操作说明</dt>
            <dd>{lineup.description}</dd>
          </div>
          {lineup.aliases.length > 0 && (
            <div className="wide">
              <dt>搜索别名</dt>
              <dd className="aliasrow">
                {lineup.aliases.map((a) => (
                  <span className="alias" key={a}>
                    {a}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {lineup.source && (
            <div className="wide">
              <dt>来源</dt>
              <dd>
                {/^https?:/.test(lineup.source) ? (
                  <a href={lineup.source} target="_blank" rel="noreferrer noopener">
                    {lineup.source}
                  </a>
                ) : (
                  lineup.source
                )}
              </dd>
            </div>
          )}
          <div className="wide muted small">
            <dt>录入 / 更新</dt>
            <dd>
              {lineup.createdAt} / {lineup.updatedAt}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
