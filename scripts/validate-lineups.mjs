/**
 * 点位数据体检：id 唯一、字段合法、图片文件真的存在。
 * 构建前会跑一次，任何一条不合格就直接失败，避免线上出现裂图或脏数据。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lineups = JSON.parse(readFileSync(join(root, 'src', 'data', 'lineups.json'), 'utf8'))

const SIDES = ['T', 'CT']
const GRENADES = ['烟雾弹', '闪光弹', '燃烧弹', '手雷']
const METHODS = ['站投', '跳投', '跑投', '跑跳投', '蹲投', '双键跳投', '其他']
const ZONES = ['A', 'MID', 'B']
const { MAPS } = await import(new URL('../src/data/maps.ts', import.meta.url).href)
const MAP_IDS = MAPS.map((m) => m.id)

const errors = []
const warnings = []
const seen = new Map()
const combos = new Map()

for (const [i, l] of lineups.entries()) {
  const at = `第 ${i + 1} 条（${l.id || '无 id'}）`
  for (const key of ['id', 'map', 'side', 'startLocation', 'targetLocation', 'grenadeType', 'throwMethod', 'description', 'image', 'zone']) {
    if (!l[key]) errors.push(`${at}：缺少字段 ${key}`)
  }
  if (l.map && !MAP_IDS.includes(l.map)) errors.push(`${at}：map「${l.map}」不在 src/data/maps.ts 里`)
  if (l.side && !SIDES.includes(l.side)) errors.push(`${at}：side 只能是 T 或 CT`)
  if (l.grenadeType && !GRENADES.includes(l.grenadeType)) errors.push(`${at}：grenadeType 不合法`)
  if (l.throwMethod && !METHODS.includes(l.throwMethod)) errors.push(`${at}：throwMethod 不合法`)
  if (l.zone && !ZONES.includes(l.zone)) errors.push(`${at}：zone 只能是 A / MID / B`)
  if (!Array.isArray(l.aliases) || l.aliases.length === 0) errors.push(`${at}：aliases 不能为空`)

  if (l.id) {
    if (seen.has(l.id)) errors.push(`${at}：id 与「${seen.get(l.id)}」重复`)
    else seen.set(l.id, l.id)
  }

  for (const field of ['image', 'thumbnail']) {
    const p = l[field]
    if (!p) continue
    if (/^https?:/.test(p)) continue
    if (!existsSync(join(root, 'public', p))) errors.push(`${at}：图片不存在 public/${p}`)
  }
  if (!l.thumbnail) warnings.push(`${at}：没有缩略图，列表会直接加载大图`)

  const combo = [l.map, l.side, l.startLocation, l.targetLocation, l.grenadeType, l.throwMethod].join('|')
  if (combos.has(combo)) warnings.push(`${at}：与「${combos.get(combo)}」阵营/起点/目标/道具/投法完全相同，可能是重复点位`)
  else combos.set(combo, l.id)
}

const samples = lineups.filter((l) => l.isSample).length
const perMap = MAPS.map((m) => `${m.short} ${lineups.filter((l) => l.map === m.id).length}`).join(' / ')
console.log(`[validate] 共 ${lineups.length} 条点位（其中示例 ${samples} 条）｜ ${perMap}`)
if (warnings.length) {
  console.log('\n提醒：')
  warnings.forEach((w) => console.log('  · ' + w))
}
if (errors.length) {
  console.error('\n错误：')
  errors.forEach((e) => console.error('  ✗ ' + e))
  process.exit(1)
}
console.log('[validate] 通过 ✓')
