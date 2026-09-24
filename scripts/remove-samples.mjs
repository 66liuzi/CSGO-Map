#!/usr/bin/env node
/**
 * 一键删除全部示例数据
 * ==================================================================
 * 正式录入真实点位后，用这个脚本把 5 条示例记录和它们的占位图一起删掉。
 *   node scripts/remove-samples.mjs          # 预览要删什么
 *   node scripts/remove-samples.mjs --yes    # 真的删
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataFile = join(root, 'src', 'data', 'lineups.json')
const lineups = JSON.parse(readFileSync(dataFile, 'utf8'))
const samples = lineups.filter((l) => l.isSample)
const rest = lineups.filter((l) => !l.isSample)

if (samples.length === 0) {
  console.log('没有示例数据，无需处理。')
  process.exit(0)
}

console.log(`将删除 ${samples.length} 条示例点位：`)
samples.forEach((l) => console.log(`  · ${l.id} — ${l.startLocation} → ${l.targetLocation}`))

if (!process.argv.includes('--yes')) {
  console.log('\n这是预览。确认后加 --yes 重新运行：node scripts/remove-samples.mjs --yes')
  process.exit(0)
}

for (const l of samples) {
  for (const p of [l.image, l.thumbnail]) {
    if (!p) continue
    const file = join(root, 'public', p)
    if (existsSync(file)) {
      unlinkSync(file)
      console.log('删除图片', p)
    }
  }
}

writeFileSync(dataFile, JSON.stringify(rest, null, 2) + '\n')
console.log(`\n已删除示例，剩余 ${rest.length} 条正式点位。`)
console.log('接着跑：node scripts/gen-image-sizes.mjs && npm test && npm run build')
