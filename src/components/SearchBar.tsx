import { useEffect, useRef } from 'react'
import { voiceSupported } from '../lib/voice'

interface Props {
  value: string
  onChange: (v: string) => void
  onMicClick: () => void
  listening: boolean
  hint: string | null
}

export default function SearchBar({ value, onChange, onMicClick, listening, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const supported = voiceSupported()

  // 输入框保持可见（用键盘时不被底部遮住）
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const onFocus = () => {
      window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 260)
    }
    el.addEventListener('focus', onFocus)
    return () => el.removeEventListener('focus', onFocus)
  }, [])

  return (
    <div className="searchbar">
      <div className={`searchbox${listening ? ' is-listening' : ''}`}>
        <span className="search-ico" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M15.5 15.5 21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          className="searchinput"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="搜道具：警家烟 / A大 / Xbox / 我在A大怎么封警家"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="搜索道具点位"
        />
        {value && (
          <button className="iconbtn" onClick={() => onChange('')} aria-label="清空搜索" title="清空">
            ✕
          </button>
        )}
        <button
          className={`iconbtn mic${listening ? ' active' : ''}`}
          onClick={onMicClick}
          aria-label="语音搜索"
          title={supported ? '按住说话：说出你的问题' : '当前浏览器不支持网页语音，请用键盘上的语音输入'}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18.5V21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {hint && <div className="hintbar">{hint}</div>}
    </div>
  )
}
