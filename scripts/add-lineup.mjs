#!/usr/bin/env node
/**
 * 新增点位助手
 * ==================================================================
 * 用途：把「一张准心图 + 一句人话」变成一条正式点位记录。
 * 这是给 AI 用的脚本，用户不需要手改 JSON、不需要重命名文件、不需要碰 git。
 *
 * 用法示例：
 *   node scripts/add-lineup.mjs \
 *     --image ~/Downloads/x.jpg \
 *     --desc "这是T方从A大外扔警家烟，站投，贴住墙角按照图片准心直接左键。"
 *
 * 说明里信息不全时，可以补参数：
 *   --side T --start A大外 --target 警家 --grenade 烟雾弹 --method 站投 --zone A
 *   --aliases "警家烟,CT烟"   --source "https://..."   --allow-duplicate
 *
 * 脚本会：解析说明 → 补别名 → 查重 → 处理图片 → 写入 lineups.json → 自检
 * 关键信息缺失时会明确列出缺什么，并提示去问用户。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const imagesDir = join(root, 'public', 'images', 'dust2')
const dataFile = join(root, 'src', 'data', 'lineups.json')

/* ---------------- 参数 ---------------- */
const argv = process.argv.slice(2)
const arg = (name, fallback = undefined) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(`--${name}`)

const opts = {
  image: arg('image'),
  desc: arg('desc'),
  side: arg('side'),
  start: arg('start'),
  target: arg('target'),
  grenade: arg('grenade'),
  method: arg('method'),
  zone: arg('zone'),
  aliases: arg('aliases'),
  source: arg('source'),
  id: arg('id'),
  date: arg('date'),
  allowDuplicate: flag('allow-duplicate'),
  dryRun: flag('dry-run'),
}

if (!opts.desc) {
  console.error(`缺少 --desc（一句说明）。例如：
  node scripts/add-lineup.mjs --image ~/Downloads/x.jpg --desc "T方从A大外扔警家烟，站投，按图片准心左键"`)
  process.exit(2)
}

/* ---------------- 读词库（复用界面同一份同义词配置） ---------------- */
let syn
try {
  syn = await import(new URL('../src/data/synonyms.ts', import.meta.url).href)
} catch (e) {
  console.error('[add-lineup] 无法加载 src/data/synonyms.ts：', e.message)
  console.error('请用 Node 22.18+ 运行（本机 node -v 需 >= 22.18）')
  process.exit(2)
}
const { ALL_GROUPS, ZONE_MAP, LOCATION_GROUPS, GRENADE_GROUPS, SIDE_GROUPS, METHOD_GROUPS } = syn

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')

/** 在文本里找某个同义组的所有出现位置 */
function findGroups(text, groups) {
  const t = norm(text)
  const found = []
  for (const g of groups) {
    for (const term of g.terms) {
      const key = norm(term)
      if (!key || key.length < 2) continue
      let from = 0
      for (;;) {
        const idx = t.indexOf(key, from)
        if (idx < 0) break
        found.push({ group: g, index: idx, length: key.length, term })
        from = idx + key.length
      }
    }
  }
  return found.sort((a, b) => a.index - b.index || b.length - a.length)
}

/* ---------------- 解析说明 ---------------- */
function parseDesc(desc) {
  const out = {}

  const side = findGroups(desc, SIDE_GROUPS)
  // 单字母 T/CT 容易误判，优先长词；再用「T方/CT」这种明确写法兜底
  const explicitSide = /\bct\b|ct方|警方|警察|ct出生|反恐/i.test(desc)
    ? 'CT'
    : /\bt方|匪|恐怖分子|t\s*spawn|t出生/i.test(desc)
      ? 'T'
      : side.length
        ? side[0].group.canon
        : undefined
  if (explicitSide) out.side = explicitSide

  const grenade = findGroups(desc, GRENADE_GROUPS)
  if (grenade.length) out.grenade = grenade[0].group.canon

  const method = findGroups(desc, METHOD_GROUPS)
  if (method.length) {
    // 最长优先：跑跳投 > 跳投
    out.method = method.sort((a, b) => b.length - a.length)[0].group.canon
  }

  // 位置：按出现顺序，第一个是起点，第二个是目标
  const locs = []
  const seen = new Set()
  for (const hit of findGroups(desc, LOCATION_GROUPS)) {
    if (seen.has(hit.group.canon)) continue
    // 去掉被更长匹配覆盖的重叠项
    if (locs.some((l) => hit.index >= l.index && hit.index < l.index + l.length)) continue
    seen.add(hit.group.canon)
    locs.push(hit)
  }
  if (locs[0]) out.start = locs[0].group.canon
  if (locs[1]) out.target = locs[1].group.canon
  // 「从A扔B」里 B 是目标；如果说明是「A大烟」只有一个位置，就交给人/AI 判断
  return out
}

const parsed = parseDesc(opts.desc)
for (const key of ['side', 'start', 'target', 'grenade', 'method']) {
  if (!opts[key] && parsed[key]) opts[key] = parsed[key]
}

/* ---------------- 缺信息就明确报出来 ---------------- */
const missing = []
if (!opts.side) missing.push('阵营（T / CT）')
if (!opts.start) missing.push('起始位置（从哪扔）')
if (!opts.target) missing.push('投掷目标（扔到哪）')
if (!opts.grenade) missing.push('道具类型（烟雾弹 / 闪光弹 / 燃烧弹 / 手雷）')
if (missing.length) {
  console.error('信息不完整，需要向用户确认以下内容（只问这些，别问别的）：')
  missing.forEach((m) => console.error('  ? ' + m))
  console.error('\n当前已识别：', JSON.stringify({ ...opts, image: opts.image }, null, 2))
  process.exit(3)
}
if (!opts.method) {
  console.log('提醒：没有识别到投法，已按「其他」记录，稍后可让用户补充。')
  opts.method = '其他'
}
if (!opts.date) opts.date = new Date().toISOString().slice(0, 10)

/* ---------------- 生成 id / 文件名 ---------------- */
const LOC_SLUG = {
  警家: 'ctspawn',
  匪家: 'tspawn',
  A大: 'along',
  A小: 'ashort',
  A平台: 'asite',
  中路: 'mid',
  B洞: 'btunnel',
  B门: 'bdoor',
  B平台: 'bsite',
  Xbox: 'xbox',
}
const NADE_SLUG = { 烟雾弹: 'smoke', 闪光弹: 'flash', 燃烧弹: 'molotov', 手雷: 'he' }
const slugOf = (loc, fallback) => LOC_SLUG[loc] ?? norm(loc).replace(/[^a-z0-9]/g, '') ?? fallback
const startSlug = slugOf(opts.start, 'loc') || 'loc'
const targetSlug = slugOf(opts.target, 'loc') || 'loc'
const prefix = `d2-${opts.side.toLowerCase()}-${startSlug}-${targetSlug}-${NADE_SLUG[opts.grenade] ?? 'nade'}`

const lineups = JSON.parse(readFileSync(dataFile, 'utf8'))
const usedIds = new Set(lineups.map((l) => l.id))
let seq = 1
if (!opts.id) {
  const nums = lineups
    .map((l) => l.id.match(new RegExp(`^${prefix}-(\\d+)$`)))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  seq = nums.length ? Math.max(...nums) + 1 : 1
}
const id = opts.id ?? `${prefix}-${String(seq).padStart(4, '0')}`
if (usedIds.has(id)) {
  console.error(`id「${id}」已存在，请用 --id 指定新的编号`)
  process.exit(4)
}

/* ---------------- 别名自动补充 ---------------- */
const SHORT = { 烟雾弹: '烟', 闪光弹: '闪', 燃烧弹: '火', 手雷: '雷' }
const short = SHORT[opts.grenade]
const aliasSet = new Set()
const addAlias = (a) => {
  const v = String(a || '').trim()
  if (v) aliasSet.add(v)
}

addAlias(`${opts.start}${opts.target}${short}`)
addAlias(`${opts.target}${short}`)
addAlias(`${opts.start}${short}`)
addAlias(`${opts.start}${opts.target}`)
addAlias(`${opts.target}${opts.grenade}`)

// 目标位置的所有同义写法 + 道具短名（警察家烟 / CT烟 / CT Spawn烟 ...）
const targetGroup = LOCATION_GROUPS.find((g) => norm(g.canon) === norm(opts.target))
const startGroup = LOCATION_GROUPS.find((g) => norm(g.canon) === norm(opts.start))
const grenadeGroup = GRENADE_GROUPS.find((g) => norm(g.canon) === norm(opts.grenade))
for (const t of targetGroup?.terms ?? []) addAlias(`${t}${short}`)
for (const t of grenadeGroup?.terms ?? []) addAlias(`${opts.target}${t}`)
if (startGroup && targetGroup) addAlias(`${startGroup.terms[0]}${targetGroup.terms[0]}${short}`)
// 阵营视角说法：CT烟 / T火
addAlias(`${opts.side}${short}`)
// 英文说法
const enStart = (startGroup?.terms ?? []).find((t) => /^[a-z0-9 ]+$/.test(t))
const enTarget = (targetGroup?.terms ?? []).find((t) => /^[a-z0-9 ]+$/.test(t))
const EN_NADE = { 烟雾弹: 'smoke', 闪光弹: 'flash', 燃烧弹: 'molotov', 手雷: 'he' }
if (enTarget) addAlias(`${enTarget} ${EN_NADE[opts.grenade]}`)
if (enStart && enTarget) addAlias(`${enStart} to ${enTarget} ${EN_NADE[opts.grenade]}`)
for (const a of String(opts.aliases || '').split(/[,，;；]/)) addAlias(a)

/* ---------------- 查重 ---------------- */
const sameCombo = lineups.filter(
  (l) =>
    l.side === opts.side &&
    l.startLocation === opts.start &&
    l.targetLocation === opts.target &&
    l.grenadeType === opts.grenade &&
    l.throwMethod === opts.method
)
if (sameCombo.length && !opts.allowDuplicate) {
  console.error('发现可能重复的点位（阵营/起点/目标/道具/投法完全相同）：')
  sameCombo.forEach((l) => console.error(`  · ${l.id} — ${l.startLocation} → ${l.targetLocation}${short}`))
  console.error('\n如果瞄点或投法不同，属于两条不同点位：加 --allow-duplicate 重新运行，')
  console.error('并在标题/说明里写清区别（例如「蹲投版」「站投版」）。禁止覆盖已有记录。')
  process.exit(5)
}

/* ---------------- 处理图片 ---------------- */
let imagePath = undefined
if (!opts.image && !opts.dryRun) {
  console.error('缺少 --image（准心瞄点图片路径）')
  process.exit(2)
}

if (opts.image && !opts.dryRun) {
  const src = opts.image.startsWith('~') ? join(os.homedir(), opts.image.slice(1)) : resolve(opts.image)
  if (!existsSync(src)) {
    console.error(`找不到图片：${src}`)
    process.exit(2)
  }
  const out = execFileSync(
    'python3',
    [join(root, 'scripts', 'process_image.py'), '--src', src, '--name', id, '--out', imagesDir],
    { encoding: 'utf8' }
  )
  console.log('[image]', out.trim().split('\n').slice(-1)[0] ?? 'ok')
  imagePath = `images/dust2/${id}.webp`
}

/* ---------------- 组装记录 ---------------- */
const zone = opts.zone ?? ZONE_MAP[opts.target] ?? ZONE_MAP[opts.start]
if (!zone) {
  console.error(`无法判断区域（A / MID / B）：${opts.target} / ${opts.start} 不在 zone 映射里。`)
  console.error('请在 src/data/synonyms.ts 的 ZONE_MAP 里登记这个位置，或用 --zone 指定。')
  process.exit(6)
}

const record = {
  id,
  map: 'Dust II/炽热沙城',
  side: opts.side,
  startLocation: opts.start,
  targetLocation: opts.target,
  grenadeType: opts.grenade,
  throwMethod: opts.method,
  description: opts.desc.trim(),
  aliases: [...aliasSet],
  image: imagePath ?? `images/dust2/${id}.webp`,
  thumbnail: (imagePath ?? `images/dust2/${id}.webp`).replace(/\.webp$/, '-thumb.webp'),
  zone,
  createdAt: opts.date,
  updatedAt: opts.date,
  ...(opts.source ? { source: opts.source } : {}),
}

console.log('\n将要写入的点位：')
console.log(JSON.stringify(record, null, 2))

if (opts.dryRun) {
  console.log('\n[dry-run] 没有写入任何文件。')
  process.exit(0)
}

// 真实点位插在示例前面，示例永远排在最后，方便以后替换
const firstSample = lineups.findIndex((l) => l.isSample)
const next = [...lineups]
if (firstSample >= 0) next.splice(firstSample, 0, record)
else next.push(record)
writeFileSync(dataFile, JSON.stringify(next, null, 2) + '\n')

console.log('\n[写入完成] src/data/lineups.json')
console.log('\n接下来请执行：')
console.log('  node scripts/gen-image-sizes.mjs && node scripts/validate-lineups.mjs')
console.log('  npm test            # 搜索测试')
console.log('  npm run build       # 正式构建')
console.log('\n应测的搜索词：')
console.log(`  ${opts.target}${short} / ${opts.side}${short} / ${opts.start} / 我在${opts.start}怎么封${opts.target}`)
