/**
 * 语音查询：浏览器支持就用 Web Speech API，不支持就明确告诉用户用键盘语音。
 * 不承诺离线语音识别（浏览器语音识别本身依赖网络）。
 */

interface SpeechRecognitionAlternative {
  transcript: string
}
interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}
interface SpeechRecognitionEventLike extends Event {
  results: { length: number; [i: number]: SpeechRecognitionResult }
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: Event & { error?: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type Ctor = new () => SpeechRecognitionLike

function getCtor(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: Ctor
    webkitSpeechRecognition?: Ctor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const voiceSupported = () => !!getCtor()

export interface VoiceCallbacks {
  onPartial?: (text: string) => void
  onFinal: (text: string) => void
  onError: (kind: 'denied' | 'nospeech' | 'unsupported' | 'other', message?: string) => void
  onEnd?: () => void
}

/** 开始识别，返回一个「停止」函数 */
export function startVoice(cb: VoiceCallbacks): () => void {
  const Ctor = getCtor()
  if (!Ctor) {
    cb.onError('unsupported')
    return () => undefined
  }

  const rec = new Ctor()
  rec.lang = 'zh-CN'
  rec.continuous = false
  rec.interimResults = true
  rec.maxAlternatives = 1

  let finalText = ''

  rec.onresult = (event) => {
    let interim = ''
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i]
      const text = res[0]?.transcript ?? ''
      if (res.isFinal) finalText += text
      else interim += text
    }
    const current = (finalText + interim).trim()
    if (current) cb.onPartial?.(current)
  }

  rec.onerror = (e) => {
    const err = (e as { error?: string }).error ?? 'other'
    if (err === 'not-allowed' || err === 'service-not-allowed') cb.onError('denied')
    else if (err === 'no-speech') cb.onError('nospeech')
    else cb.onError('other', err)
  }

  rec.onend = () => {
    if (finalText.trim()) cb.onFinal(finalText.trim())
    cb.onEnd?.()
  }

  try {
    rec.start()
  } catch {
    cb.onError('other', 'start-failed')
  }

  return () => {
    try {
      rec.stop()
    } catch {
      /* 已经停了 */
    }
  }
}
