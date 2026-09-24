import { useEffect, useState } from 'react'
import { isIOS, isStandalone, onInstallAvailability, promptInstall, swSupported } from '../lib/pwa'

interface Props {
  open: boolean
  onClose: () => void
  onToast: (text: string, tone?: 'info' | 'warn') => void
}

export default function InstallGuide({ open, onClose, onToast }: Props) {
  const [canPrompt, setCanPrompt] = useState(false)
  const ios = isIOS()
  const standalone = isStandalone()

  useEffect(() => onInstallAvailability(setCanPrompt), [])

  if (!open) return null

  const install = async () => {
    const ok = await promptInstall()
    if (ok) {
      onToast('已安装到主屏幕，可以从桌面图标直接打开')
      onClose()
    } else if (!canPrompt) {
      onToast(ios ? '请按下面的 iPhone 步骤添加' : '这个浏览器没有自动安装提示，请按安卓步骤从菜单添加', 'warn')
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="添加到主屏幕">
      <div className="modalbackdrop" onClick={onClose} />
      <div className="modalpanel narrow">
        <div className="modalhead">
          <h2>添加到手机主屏幕</h2>
          <button className="closebtn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        {standalone && <p className="muted">你现在已经是以 App 方式打开的（独立窗口模式），不需要再安装。</p>}

        <section className="guide">
          <h3>iPhone / iPad（Safari）</h3>
          <ol>
            <li>用 Safari 打开本页面（微信里打开的不行，要点右上角「在浏览器中打开」）。</li>
            <li>点击底部中间的「分享」按钮。</li>
            <li>在菜单里选择「添加到主屏幕」。</li>
            <li>点右上角「添加」，桌面就会出现「沙城道具」图标。</li>
          </ol>
        </section>

        <section className="guide">
          <h3>安卓（Chrome / Edge）</h3>
          <ol>
            <li>用 Chrome 打开本页面。</li>
            <li>如果弹出「安装应用 / 添加到主屏幕」，直接点安装。</li>
            <li>没有弹窗时：点右上角「⋮」菜单 →「添加到主屏幕 / 安装应用」。</li>
          </ol>
          {canPrompt && (
            <button className="btn primary" onClick={install}>
              立即安装到手机
            </button>
          )}
        </section>

        <section className="guide">
          <h3>离线使用</h3>
          <p className="muted">
            安装或加入主屏幕后，点一次页面底部的「离线保存全部点位」，之后断网也能查（图片和搜索都可用）。
          </p>
        </section>

        {!swSupported() && <p className="muted small">当前浏览器不支持 Service Worker，离线功能不可用，但联网搜索正常。</p>}
      </div>
    </div>
  )
}
