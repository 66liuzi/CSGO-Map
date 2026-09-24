/**
 * 统计 public/images/dust2 下的图片文件数量与总大小，写入 src/data/imageSizes.json。
 * 界面用它显示「全部点位图约 xx MB」，不用在运行时去猜。
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'public', 'images', 'dust2')

let count = 0
let total = 0
try {
  for (const f of readdirSync(dir)) {
    if (!/\.(webp|jpg|jpeg|png)$/i.test(f)) continue
    count++
    total += statSync(join(dir, f)).size
  }
} catch {
  /* 目录还不存在 */
}

const out = { count, total, generatedAt: new Date().toISOString().slice(0, 10) }
writeFileSync(join(root, 'src', 'data', 'imageSizes.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`[image-sizes] ${count} 张图片 / ${(total / 1024 / 1024).toFixed(2)} MB`)
