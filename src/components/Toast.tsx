import { useState } from 'react'

export interface ToastMsg {
  id: number
  text: string
  tone?: 'info' | 'warn'
}

export default function Toast({ items }: { items: ToastMsg[] }) {
  if (items.length === 0) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast${t.tone === 'warn' ? ' warn' : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

/** 简单的 toast 队列（最多同时显示 2 条） */
export function useToast() {
  const [items, setItems] = useState<ToastMsg[]>([])
  const push = (text: string, tone: 'info' | 'warn' = 'info', ms = 3200) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev.slice(-1), { id, text, tone }])
    window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), ms)
  }
  return { items, push }
}
