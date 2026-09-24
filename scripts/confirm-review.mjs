#!/usr/bin/env node
/**
 * 取消「待确认」标记（用户看过图、OK 了）
 * ==================================================================
 * 用法：
 *   node scripts/confirm-review.mjs --id d2-t-mid-ctspawn-smoke-0001
 *   node scripts/confirm-review.mjs --all              # 全部确认
 *   node scripts/confirm-review.mjs --list             # 只列出还待确认的
 *
 * 同时可以做小修改（用户口头说的）：
 *   node scripts/confirm-review.mjs --id xxx --side CT --method 蹲投
 *   node scripts/confirm-review.mjs --id xxx --alias "中门封警家烟,中路警家烟"
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataFile = join(root, 'src', 'data', 'lineups.json')

const argv = process.argv.slice(2)
const has = (n) => argv.includes(`--${n}`)
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}

const lineups = JSON.parse(readFileSync(dataFile, 'utf8'))
const pending = lineups.filter((l) => l.needsReview && !l.isSample)

if (has('list') || (!arg('id') && !has('all'))) {
  if (!pending.length) console.log('[confirm] 没有待确认的点位 ✓')
  else {
    console.log(`[confirm] 还有 ${pending.length} 条待确认：`)
    pending.forEach((l) => console.log(`  · ${l.id} — ${l.startLocation} → ${l.targetLocation}${l.grenadeType}（${l.throwMethod}）`))
    console.log('\n确认用：node scripts/confirm-review.mjs --id <id>   或   --all')
  }
  process.exit(0)
}

const targets = has('all') ? pending : lineups.filter((l) => l.id === arg('id'))
if (!targets.length) {
  console.error(`没找到点位：${arg('id')}`)
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)
const edits = []
if (arg('side')) edits.push(['side', arg('side')])
if (arg('start')) edits.push(['startLocation', arg('start')])
if (arg('target')) edits.push(['targetLocation', arg('target')])
if (arg('grenade')) edits.push(['grenadeType', arg('grenade')])
if (arg('method')) edits.push(['throwMethod', arg('method')])
if (arg('zone')) edits.push(['zone', arg('zone')])

for (const l of targets) {
  for (const [k, v] of edits) l[k] = v
  const extra = String(arg('alias', ''))
    .split(/[,，;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const a of extra) if (!l.aliases.includes(a)) l.aliases.push(a)
  l.needsReview = false
  l.updatedAt = today
}

writeFileSync(dataFile, JSON.stringify(lineups, null, 2) + '\n')
console.log(`[confirm] 已确认 ${targets.length} 条：`)
targets.forEach((l) => console.log(`  ✓ ${l.id} — ${l.startLocation} → ${l.targetLocation}${l.grenadeType}`))
console.log('\n接下来记得跑：npm run check && npm run build，然后 git 提交推送。')
