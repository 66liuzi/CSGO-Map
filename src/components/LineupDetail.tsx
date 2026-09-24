import { useEffect } from 'react'
import { assetUrl } from '../lib/assets'
import type { Lineup } from '../data/types'
import { GRENADE_SHORT, lineupTitle, ZONE_LABEL } from '../data/types'
import { mapFullName } from '../data/maps'

interface Props {
  lineup: Lineup | null
  onClose: () => void
}

/**
 * 准心图：不做自定义手势缩放（难用）。
 * 点图片或按钮 → 用系统自带看图器打开原图，双指缩放、长按保存都交给系统/浏览器。
 * 弹窗里这张图本身也尽量给大，多数情况不用放大就看得清。
 */
function LineupImage({ src, alt, filename }: { src: string; alt: string; filename: string }) {
  return (
    <div className="zoomarea">
      <a
        className="zoomimg"
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="用系统查看器打开原图"
      >
        <img src={src} alt={alt} />
        <span className="zoomhint" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M10.5 7.5v6M7.5 10.5h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          点击用系统看图器放大
        </span>
      </a>
      <div className="zoombar">
        <a className="zoombtn" href={src} target="_blank" rel="noopener noreferrer">
          系统看图器打开
        </a>
        <a className="zoombtn ghost" href={src} download={filename}>
          保存图片
        </a>
      </div>
      <div className="zoomtip">
        点图片或上面的按钮，用手机 / 电脑自带的看图器放大；长按图片可直接保存到相册。
      </div>
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

  const title = lineupTitle(lineup)
  const src = assetUrl(lineup.image)
  const filename = `${title.replace(/[\\/:*?"<>|]/g, '')}.webp`

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modalbackdrop" onClick={onClose} />
      <div className="modalpanel">
        <div className="modalhead">
          <div className="modaltitle">
            <h2>{title}</h2>
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

        <LineupImage src={src} alt={`${title} 准心瞄点图`} filename={filename} />

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
