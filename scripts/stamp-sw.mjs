/**
 * 构建前把 sw.template.js 生成为 public/sw.js，并把版本号替换进去。
 * 版本号 = 构建时间戳（+ 可选 git 短 hash）。
 * 每次构建 SW 文件内容都会变 → 浏览器能检测到新版本 → 页面提示「发现新版本」。
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

let sha = ''
try {
  sha = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {
  /* 还没 git init 也没关系 */
}

const version = `${Date.now()}${sha ? '-' + sha : ''}`
const template = readFileSync(resolve(root, 'scripts/sw.template.js'), 'utf8')
const output = template.replaceAll('__BUILD_VERSION__', version)

mkdirSync(resolve(root, 'public'), { recursive: true })
writeFileSync(resolve(root, 'public/sw.js'), output)
console.log(`[stamp-sw] public/sw.js 版本号 = ${version}`)
