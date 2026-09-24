import { useCallback, useEffect, useRef, useState } from 'react'

export interface ZoomState {
  /** 缩放倍数，1 = 原始（适配容器）大小 */
  scale: number
  /** 平移量（相对缩放后图片中心，单位 px） */
  tx: number
  ty: number
}

interface Options {
  minScale?: number
  maxScale?: number
}

const DEFAULT_OPTIONS: Required<Options> = { minScale: 1, maxScale: 4 }

/**
 * 图片捏合缩放 + 拖拽。手感对齐系统看图器：
 * - 单指拖动平移
 * - 双指捏合缩放，缩放中心跟随双指中点
 * - 双击切换 1x / 2.5x，双击拖动连续缩放（iOS 原生手感）
 * - 缩放限制 [minScale, maxScale]，回到 1x 时位移归零
 * - 边界约束：图片始终不能拖出可视范围（不露白）
 *
 * 依赖 Pointer Events（iOS 13+ / 现代桌面均支持），并把容器设为
 * touch-action:none，从而让手势只作用于图片、不触发整页缩放。
 */
export function usePinchZoom(options: Options = {}) {
  const { minScale, maxScale } = { ...DEFAULT_OPTIONS, ...options }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, tx: 0, ty: 0 })

  // 用 ref 同步最新值，供事件回调读取，避免闭包过期
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const boxRef = useRef({ cw: 0, ch: 0, iw: 0, ih: 0 })

  // 指针映射：pointerId -> { x, y }
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())

  // 手势起始快照
  const gestureRef = useRef<{
    startScale: number
    startTx: number
    startTy: number
    startDist: number
    startMid: { x: number; y: number }
    // 单指拖拽时的起点
    dragStart: { x: number; y: number; tx: number; ty: number } | null
  } | null>(null)

  // 双击检测
  const lastTapRef = useRef(0)

  const measure = useCallback(() => {
    const c = containerRef.current
    const im = imgRef.current
    if (!c) return
    boxRef.current.cw = c.clientWidth
    boxRef.current.ch = c.clientHeight
    // 图片按容器宽度适配后的“基准尺寸”（scale=1 时的显示尺寸）
    if (im) {
      const naturalW = im.naturalWidth || 1
      const naturalH = im.naturalHeight || 1
      const ratio = Math.min(c.clientWidth / naturalW, c.clientHeight / naturalH)
      boxRef.current.iw = naturalW * ratio
      boxRef.current.ih = naturalH * ratio
    }
  }, [])

  // 把位移限制在合理范围：缩放后图片不拖出可视区
  const clamp = useCallback((tx: number, ty: number, scale: number) => {
    const { cw, ch, iw, ih } = boxRef.current
    // 缩放后图片显示尺寸
    const w = iw * scale
    const h = ih * scale
    // 允许图片在某个方向上的最大偏移（超出容器就限制住，避免露白）
    const maxX = Math.max(0, (w - cw) / 2)
    const maxY = Math.max(0, (h - ch) / 2)
    return {
      tx: Math.max(-maxX, Math.min(maxX, tx)),
      ty: Math.max(-maxY, Math.min(maxY, ty)),
    }
  }, [])

  const apply = useCallback(
    (next: ZoomState) => {
      setZoom(next)
      const im = imgRef.current
      if (im) {
        im.style.transform = `translate(${next.tx}px, ${next.ty}px) scale(${next.scale})`
      }
    },
    [],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // 只处理主触摸/鼠标左键
      if (e.pointerType === 'mouse' && e.button !== 0) return
      measure()
      const c = containerRef.current
      if (c) c.setPointerCapture(e.pointerId)

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const { scale, tx, ty } = zoomRef.current
      const pts = pointersRef.current

      if (pts.size === 1) {
        // 单指：拖拽起点
        gestureRef.current = {
          startScale: scale,
          startTx: tx,
          startTy: ty,
          startDist: 0,
          startMid: { x: e.clientX, y: e.clientY },
          dragStart: { x: e.clientX, y: e.clientY, tx, ty },
        }
      } else if (pts.size === 2) {
        // 双指：捏合起点
        const [a, b] = Array.from(pts.values())
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        gestureRef.current = {
          startScale: scale,
          startTx: tx,
          startTy: ty,
          startDist: dist || 1,
          startMid: mid,
          dragStart: null,
        }
      }

      // 双击检测
      const now = Date.now()
      if (e.pointerType !== 'mouse' && now - lastTapRef.current < 300) {
        lastTapRef.current = 0
        // 双击：1x <-> 2.5x（以点击处为缩放中心）
        const target = scale > 1.001 ? 1 : 2.5
        const cw = boxRef.current.cw
        const ch = boxRef.current.ch
        const px = e.clientX - (c?.getBoundingClientRect().left ?? 0) - cw / 2
        const py = e.clientY - (c?.getBoundingClientRect().top ?? 0) - ch / 2
        const ratio = target / scale
        const raw = { tx: (tx - px) * ratio + px, ty: (ty - py) * ratio + py }
        const n = clamp(raw.tx, raw.ty, target)
        apply({ scale: target, tx: n.tx, ty: n.ty })
        return
      }
      lastTapRef.current = now
    },
    [measure, apply, clamp],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const g = gestureRef.current
      if (!g) return
      const pts = pointersRef.current

      if (pts.size === 1 && g.dragStart) {
        // 单指拖拽
        const dx = e.clientX - g.dragStart.x
        const dy = e.clientY - g.dragStart.y
        const { tx, ty } = clamp(g.dragStart.tx + dx, g.dragStart.ty + dy, g.startScale)
        apply({ scale: g.startScale, tx, ty })
        return
      }

      if (pts.size === 2) {
        // 双指捏合
        const [a, b] = Array.from(pts.values())
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const c = containerRef.current
        const rect = c?.getBoundingClientRect()
        const cx = rect ? rect.left + rect.width / 2 : 0
        const cy = rect ? rect.top + rect.height / 2 : 0

        const newScale = Math.max(
          minScale,
          Math.min(maxScale, g.startScale * (dist / (g.startDist || 1))),
        )
        // 缩放中心跟随双指中点（相对容器中心）
        const px = g.startMid.x - cx
        const py = g.startMid.y - cy
        const ratio = newScale / g.startScale
        const ntx = (g.startTx - px) * ratio + px + (mid.x - g.startMid.x)
        const nty = (g.startTy - py) * ratio + py + (mid.y - g.startMid.y)
        const c2 = clamp(ntx, nty, newScale)
        apply({ scale: newScale, tx: c2.tx, ty: c2.ty })
      }
    },
    [apply, clamp, minScale, maxScale],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(e.pointerId)
      // 结束捏合/拖拽，快照更新为当前值，为下一段手势做准备
      const z = zoomRef.current
      gestureRef.current = null
      const pts = pointersRef.current
      if (pts.size === 1) {
        const [a] = Array.from(pts.values())
        gestureRef.current = {
          startScale: z.scale,
          startTx: z.tx,
          startTy: z.ty,
          startDist: 0,
          startMid: { x: a.x, y: a.y },
          dragStart: { x: a.x, y: a.y, tx: z.tx, ty: z.ty },
        }
      }
    },
    [],
  )

  const onPointerCancel = useCallback(() => {
    pointersRef.current.clear()
    gestureRef.current = null
  }, [])

  const reset = useCallback(() => {
    apply({ scale: 1, tx: 0, ty: 0 })
  }, [apply])

  // 图片加载完成后量一次基准尺寸
  useEffect(() => {
    const im = imgRef.current
    if (!im) return
    const onLoad = () => measure()
    if (im.complete) measure()
    else im.addEventListener('load', onLoad)
    return () => im.removeEventListener('load', onLoad)
  }, [measure])

  // 弹窗尺寸变化时重新测量并归位
  useEffect(() => {
    const onResize = () => {
      measure()
      reset()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure, reset])

  // 阻止浏览器对图片的默认拖拽（桌面端拖图会变成拖出文件）
  useEffect(() => {
    const im = imgRef.current
    if (!im) return
    const prevent = (e: Event) => e.preventDefault()
    im.addEventListener('dragstart', prevent)
    return () => im.removeEventListener('dragstart', prevent)
  }, [])

  return {
    containerRef,
    imgRef,
    zoom,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  }
}
