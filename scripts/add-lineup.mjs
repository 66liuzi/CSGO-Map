#!/usr/bin/env node
/**
 * 新增点位助手（支持多地图）
 * ==================================================================
 * 用途：把「一张准心图 + 一句人话」变成一条正式点位记录。
 * 这是给 AI 用的脚本，用户不需要手改 JSON、不需要重命名文件、不需要碰 git。
 *
 * 用法示例：
 *   node scripts/add-lineup.mjs \
 *     --image ~/Downloads/沙二_T_中门_警家_烟_跳投.jpg \
 *     --desc "T方从中门扔警家烟，跳投，按图片准心左键"
 *
 * 图名写得规范时，字段可以自动从文件名里认出来（沙二/小镇/迷城 + 阵营 + 起点 + 目标 + 道具 + 投法）：
 *   node scripts/add-lineup.mjs --image ~/Downloads/迷城_CT_警家_A1_闪_跳投.jpg
 *
 * 信息不全时用参数补：
 *   --map 沙二 --side T --start A大外 --target 警家 --grenade 烟雾弹 --method 站投 --zone A
 *   --aliases "警家烟,CT烟"   --source "https://..."   --allow-duplicate   --dry-run
 *
 * 脚本会：认地图 → 解析说明/文件名 → 补别名 → 查重 → 处理图片 → 写入 lineups.json
 * 关键信息缺失时会明确列出缺什么，并提示去问用户。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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
  map: arg('map'),
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
  noReview: flag('confirmed'), // 用户已口头确认 → 不标「待确认」
  allowDuplicate: flag('allow-duplicate'),
  dryRun: flag('dry-run'),
}

if (!opts.desc && !opts.image) {
  console.error(`缺少 --desc（一句说明）或 --image（图名规范时可自动识别）。例如：
  node scripts/add-lineup.mjs --image ~/Downloads/x.jpg --desc "T方从A大外扔警家烟，站投，按图片准心左键"`)
  process.exit(2)
}

/* ---------------- 读词库（复用界面同一份同义词配置） ---------------- */
let syn
let mapsMod
try {
  mapsMod = await import(new URL('../src/data/maps.ts', import.meta.url).href)
  syn = await import(new URL('../src/data/synonyms.ts', import.meta.url).href)
} catch (e) {
  console.error('[add-lineup] 无法加载 src/data/*.ts：', e.message)
  console.error('请用 Node 22.18+ 运行（本机 node -v 需 >= 22.18）')
  process.exit(2)
}
const { ALL_GROUPS, LOCATION_GROUPS, GRENADE_GROUPS, SIDE_GROUPS, METHOD_GROUPS, MAP_GROUPS, zoneOf } = syn
const { MAPS, MAP_BY_ID, findMapId } = mapsMod

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')

/* ---------------- 认地图 ---------------- */
function detectMap(...texts) {
  for (const t of texts) {
    if (!t) continue
    const id = findMapId(t)
    if (id) return id
  }
  // 再按地图同义组在文本里出现的位置兜底（例如「沙二 A大烟」）
  for (const t of texts) {
    if (!t) continue
    const nt = norm(t)
    for (const g of MAP_GROUPS) {
      for (const term of g.terms) {
        if (norm(term).length >= 2 && nt.includes(norm(term))) return g.canon
      }
    }
  }
  return undefined
}

/**
 * 认不出地图时的兜底：
 *   1. 看说明/图名里的位置词只在哪张图出现 → 就是它
 *   2. 还是认不出 → 默认炽热沙城，并大声提醒（AI 应该显式传 --map）
 */
function guessMap(...texts) {
  const text = norm(texts.filter(Boolean).join(' '))
  if (!text) return undefined
  const candidates = MAPS.filter((m) =>
    LOCATION_GROUPS.some(
      (g) => g.maps?.includes(m.id) && g.terms.some((t) => norm(t).length >= 2 && text.includes(norm(t)))
    )
  )
  return candidates.length === 1 ? candidates[0].id : undefined
}

const fileName = opts.image ? basename(opts.image) : ''
let mapId = detectMap(opts.map, fileName, opts.desc)
let mapGuessed = false
if (!mapId) {
  mapId = guessMap(fileName, opts.desc)
  mapGuessed = !!mapId
}
if (!mapId) {
  mapId = 'dust2'
  mapGuessed = true
  console.warn('⚠️  没认出地图，已默认按「炽热沙城」记录。请确认后加 --map 小镇 / 迷城 重跑。')
} else if (mapGuessed) {
  console.log(`ℹ️  地图按内容推断为「${MAP_BY_ID[mapId].name}」，如需改请加 --map。`)
}
if (!mapId) {
  console.error('认不出是哪张图。请加 --map 沙二 / 小镇 / 迷城（或 dust2 / inferno / mirage）。')
  console.error('也可以把图名写成「沙二_T_中门_警家_烟_跳投.jpg」这种格式，脚本能自动认。')
  process.exit(6)
}
const mapMeta = MAP_BY_ID[mapId]
if (!mapMeta) {
  console.error(`地图 id「${mapId}」不在 src/data/maps.ts 里，请先在那里登记。`)
  process.exit(6)
}
const imagesDir = join(root, 'public', 'images', mapMeta.dir)

/* ---------------- 词库（只保留这张图用得上的位置词） ---------------- */
const LOCATIONS_THIS_MAP = LOCATION_GROUPS.filter((g) => !g.maps || g.maps.includes(mapId))

/** 在文本里找某个同义组的所有出现位置（单字如「烟」「闪」只在道具/阵营里有效） */
function findGroups(text, groups) {
  const t = norm(text)
  const found = []
  for (const g of groups) {
    const minLen = g.kind === 'grenade' ? 1 : 2
    for (const term of g.terms) {
      const key = norm(term)
      if (!key || key.length < minLen) continue
      let from = 0
      for (;;) {
        const idx = t.indexOf(key, from)
        if (idx < 0) break
        found.push({ group: g, index: idx, length: key.length, term: key })
        from = idx + key.length
      }
    }
  }
  return found.sort((a, b) => a.index - b.index || b.length - a.length)
}

/**
 * 位置显示名：用户怎么说就怎么记（「中门」不会被改写成「中路」），
 * 但纯英文写法（ctspawn / mid）统一用标准词，避免出现 Ctspawn 这种怪名字。
 */
function displayName(term, group) {
  if (!/[\u4e00-\u9fff]/.test(term)) return group.canon
  return term
}

/** 把一个位置说法（如「A大外」）归到这张图的位置词库里的某个组 */
function findGroupFor(text, groups) {
  const t = norm(text)
  if (!t) return null
  let best = null
  for (const g of groups) {
    for (const term of g.terms) {
      const key = norm(term)
      if (key.length < 2) continue
      if (!t.includes(key) && !key.includes(t)) continue
      const score = Math.min(key.length, t.length)
      if (!best || score > best.score) best = { group: g, score }
    }
  }
  return best?.group ?? null
}

/* ---------------- 解析说明 / 文件名 ---------------- */
/** 按分隔符切开，处理「迷城_CT_警家_A1_闪_跳投」里单独成段的 T / 闪 */
const SEG_NADE = { 烟: '烟雾弹', 闪: '闪光弹', 火: '燃烧弹', 雷: '手雷' }
function segments(text) {
  return String(text)
    .split(/[^A-Za-z0-9\u4e00-\u9fff]+/)
    .filter(Boolean)
}

function parseText(text) {
  const out = {}
  if (!text) return out

  // 文件名里常见的单字段：「_T_」「_闪_」
  for (const seg of segments(text)) {
    const low = seg.toLowerCase()
    if (!out.side && (low === 't' || low === 'ct')) out.side = low.toUpperCase()
    if (!out.grenade && SEG_NADE[seg]) out.grenade = SEG_NADE[seg]
  }

  const side = findGroups(text, SIDE_GROUPS)
  const explicitSide = /\bct\b|ct方|警方|警察|ct出生|反恐|防守方/i.test(text)
    ? 'CT'
    : /\bt方|匪|恐怖分子|t\s*spawn|t出生|进攻方/i.test(text)
      ? 'T'
      : side.length
        ? side[0].group.canon
        : undefined
  if (explicitSide) out.side = explicitSide

  const grenade = findGroups(text, GRENADE_GROUPS)
  if (grenade.length) out.grenade = grenade[0].group.canon

  const method = findGroups(text, METHOD_GROUPS)
  if (method.length) out.method = method.sort((a, b) => b.length - a.length)[0].group.canon

  // 位置：按出现顺序，第一个是起点，第二个是目标
  const locs = []
  const seen = new Set()
  for (const hit of findGroups(text, LOCATIONS_THIS_MAP)) {
    if (seen.has(hit.group.canon)) continue
    if (locs.some((l) => hit.index >= l.index && hit.index < l.index + l.length)) continue
    seen.add(hit.group.canon)
    locs.push(hit)
  }
  if (locs[0]) out.startLoc = { display: displayName(locs[0].term, locs[0].group), group: locs[0].group }
  if (locs[1]) out.targetLoc = { display: displayName(locs[1].term, locs[1].group), group: locs[1].group }
  if (locs[0]) out.start = out.startLoc.display
  if (locs[1]) out.target = out.targetLoc.display
  return out
}

// 文件名先解析（例如「沙二_T_中门_警家_烟_跳投.jpg」），说明里的说法优先
const fromName = parseText(fileName)
const fromDesc = parseText(opts.desc)
for (const key of ['side', 'start', 'target', 'grenade', 'method']) {
  opts[key] = opts[key] ?? fromDesc[key] ?? fromName[key]
}
const startLoc = fromDesc.startLoc ?? fromName.startLoc
const targetLoc = fromDesc.targetLoc ?? fromName.targetLoc

/* ---------------- 缺信息就明确报出来 ---------------- */
const missing = []
if (!opts.side) missing.push('阵营（T / CT）')
if (!opts.start) missing.push('起始位置（从哪扔）')
if (!opts.target) missing.push('投掷目标（扔到哪）')
if (!opts.grenade) missing.push('道具类型（烟雾弹 / 闪光弹 / 燃烧弹 / 手雷）')
if (missing.length) {
  console.error(`信息不完整（地图已识别为「${mapMeta.name}」），需要向用户确认以下内容（只问这些，别问别的）：`)
  missing.forEach((m) => console.error('  ? ' + m))
  console.error('\n当前已识别：', JSON.stringify({ ...opts, image: opts.image }, null, 2))
  process.exit(3)
}
if (!opts.method) {
  console.log('提醒：没有识别到投法，已按「其他」记录，稍后可让用户补充。')
  opts.method = '其他'
}
if (!opts.date) opts.date = new Date().toISOString().slice(0, 10)
if (!opts.desc) {
  opts.desc = `${opts.side}方从${opts.start}往${opts.target}扔${opts.grenade}，${opts.method}。按准心图对准后投掷。`
  console.log('提醒：没有 --desc，已按识别结果生成一句说明，建议让 AI 或用户补充站位细节。')
}

/* ---------------- 位置归组（决定区域与文件名） ---------------- */
const startGroup =
  startLoc && startLoc.display === opts.start ? startLoc.group : findGroupFor(opts.start, LOCATIONS_THIS_MAP)
const targetGroup =
  targetLoc && targetLoc.display === opts.target ? targetLoc.group : findGroupFor(opts.target, LOCATIONS_THIS_MAP)

for (const [label, text, group] of [
  ['起点', opts.start, startGroup],
  ['目标', opts.target, targetGroup],
]) {
  if (!group) {
    console.error(`位置「${text}」不在「${mapMeta.name}」的位置词库里。`)
    console.error('请先在 src/data/synonyms.ts 的 LOCATION_GROUPS 里加上这个说法（带 maps: [\'' + mapId + '\']），')
    console.error(`并在 ZONE_MAP 里登记 '${mapId}:${text}' 属于 A / MID / B，然后重跑本脚本。`)
    process.exit(6)
  }
  if (!zoneOf(mapId, group.canon)) {
    console.error(`${label}「${text}」对应的标准词是「${group.canon}」，但 ZONE_MAP 里没登记它的区域。`)
    console.error(`请在 src/data/synonyms.ts 的 ZONE_MAP 里补上 '${mapId}:${group.canon}'，然后重跑本脚本。`)
    process.exit(6)
  }
}

/* ---------------- 生成 id / 文件名 ---------------- */
const LOC_SLUG = {
  // 通用
  警家: 'ctspawn',
  匪家: 'tspawn',
  A平台: 'asite',
  B平台: 'bsite',
  中路: 'mid',
  // 沙二
  A大: 'along',
  A小: 'ashort',
  坑: 'pit',
  B洞: 'btunnel',
  B门: 'bdoor',
  Xbox: 'xbox',
  B1: 'b1',
  B2: 'b2',
  'dust2:车': 'car',
  'dust2:油桶': 'barrel',
  'dust2:后花园': 'backgarden',
  'dust2:狙位': 'sniper',
  'dust2:狗位': 'doghouse',
  'dust2:假门': 'fakedoor',
  // 小镇
  香蕉道: 'banana',
  沙袋: 'sandbags',
  树位: 'logs',
  一箱: 'box1',
  二箱: 'box2',
  三箱: 'newbox',
  棺材: 'coffin',
  喷泉: 'fountain',
  花园: 'garden',
  锅炉房: 'boiler',
  侧道: 'alley',
  下水道: 'underpass',
  大坑: 'pit',
  小坑: 'smallpit',
  墓地: 'graveyard',
  教堂: 'church',
  书房: 'library',
  阳台: 'balcony',
  草车: 'truck',
  长廊: 'speedway',
  凹槽: 'cubby',
  马棚: 'roof',
  'inferno:车': 'car',
  'inferno:死点': 'dark',
  'inferno:拱门': 'arch',
  'inferno:A二楼': 'apts',
  // 迷城
  A1: 'a1',
  跳台: 'stairs',
  忍者位: 'ninja',
  三明治: 'sandwich',
  长箱: 'box',
  售票亭: 'ticket',
  垃圾桶: 'trash',
  VIP: 'vip',
  小黑屋: 'ladder',
  超市: 'market',
  厨房: 'kitchen',
  沙发: 'couch',
  白车: 'van',
  B小: 'bshort',
  长椅: 'bench',
  'mirage:车': 'car',
  'mirage:草车': 'cart',
  'mirage:死点': 'default',
  'mirage:拱门': 'connector',
  'mirage:A二楼': 'palace',
  'mirage:B二楼': 'bapts',
}
const NADE_SLUG = { 烟雾弹: 'smoke', 闪光弹: 'flash', 燃烧弹: 'molotov', 手雷: 'he' }
const slugFromGroup = (group) =>
  LOC_SLUG[`${mapId}:${group.canon}`] ??
  LOC_SLUG[group.canon] ??
  norm(group.canon).replace(/[^a-z0-9]/g, '') ??
  ''
const startSlug = slugFromGroup(startGroup) || 'loc'
const targetSlug = slugFromGroup(targetGroup) || 'loc'
const prefix = `${mapMeta.slug}-${opts.side.toLowerCase()}-${startSlug}-${targetSlug}-${NADE_SLUG[opts.grenade] ?? 'nade'}`

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
// 带地图的说法（「沙二警家烟」「迷城拱门烟」），换图时不会互相干扰
for (const a of mapMeta.aliases.slice(0, 3)) addAlias(`${a}${opts.target}${short}`)

const grenadeGroup = GRENADE_GROUPS.find((g) => norm(g.canon) === norm(opts.grenade))
for (const t of targetGroup.terms) addAlias(`${t}${short}`)
for (const t of grenadeGroup?.terms ?? []) addAlias(`${opts.target}${t}`)
if (targetGroup.canon !== opts.target) addAlias(opts.target)
if (startGroup.canon !== opts.start) addAlias(opts.start)
addAlias(`${opts.side}${short}`)
const enStart = (startGroup?.terms ?? []).find((t) => /^[a-z0-9 ]+$/.test(t))
const enTarget = (targetGroup?.terms ?? []).find((t) => /^[a-z0-9 ]+$/.test(t))
const EN_NADE = { 烟雾弹: 'smoke', 闪光弹: 'flash', 燃烧弹: 'molotov', 手雷: 'he' }
if (enTarget) addAlias(`${enTarget} ${EN_NADE[opts.grenade]}`)
if (enStart && enTarget) addAlias(`${enStart} to ${enTarget} ${EN_NADE[opts.grenade]}`)
for (const a of String(opts.aliases || '').split(/[,，;；]/)) addAlias(a)

/* ---------------- 查重（同一张图内比对） ---------------- */
const sameCombo = lineups.filter(
  (l) =>
    l.map === mapId &&
    l.side === opts.side &&
    l.startLocation === opts.start &&
    l.targetLocation === opts.target &&
    l.grenadeType === opts.grenade &&
    l.throwMethod === opts.method
)
if (sameCombo.length && !opts.allowDuplicate) {
  console.error(`发现可能重复的点位（${mapMeta.name} 内阵营/起点/目标/道具/投法完全相同）：`)
  sameCombo.forEach((l) => console.error(`  · ${l.id} — ${l.startLocation} → ${l.targetLocation}${short}`))
  console.error('\n如果瞄点或投法不同，属于两条不同点位：加 --allow-duplicate 重新运行，')
  console.error('并在标题/说明里写清区别（例如「蹲投版」「站投版」）。禁止覆盖已有记录。')
  process.exit(5)
}

/**
 * 找一个装了 Pillow 的 Python。
 * 有些机器上 PATH 里的 python3 是没有 Pillow 的版本（比如 homebrew / pyenv），
 * 所以逐个探测，别让用户自己去折腾环境。
 */
function resolvePython() {
  const candidates = [process.env.PYTHON, '/usr/bin/python3', 'python3', 'python'].filter(Boolean)
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['-c', 'import PIL'], { stdio: 'ignore' })
      return bin
    } catch {
      /* 试下一个 */
    }
  }
  return null
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
  const python = resolvePython()
  if (!python) {
    console.error('找不到带 Pillow 的 Python，图片无法处理。请先安装：')
    console.error('  /usr/bin/python3 -m pip install --user Pillow')
    console.error('（或用 PYTHON=/path/to/python3 指定解释器后重跑）')
    process.exit(7)
  }
  const out = execFileSync(
    python,
    [join(root, 'scripts', 'process_image.py'), '--src', src, '--name', id, '--out', imagesDir],
    { encoding: 'utf8' }
  )
  console.log('[image]', out.trim().split('\n').slice(-1)[0] ?? 'ok')
  imagePath = `images/${mapMeta.dir}/${id}.webp`
}

/* ---------------- 组装记录 ---------------- */
const zone = opts.zone ?? zoneOf(mapId, targetGroup.canon) ?? zoneOf(mapId, startGroup.canon)
if (!zone) {
  console.error(`无法判断区域（A / MID / B）：${opts.target} / ${opts.start} 不在 zone 映射里。`)
  console.error(`请在 src/data/synonyms.ts 的 ZONE_MAP 里登记 '${mapId}:${targetGroup.canon}'，或用 --zone 指定。`)
  process.exit(6)
}

const record = {
  id,
  map: mapId,
  side: opts.side,
  startLocation: opts.start,
  targetLocation: opts.target,
  grenadeType: opts.grenade,
  throwMethod: opts.method,
  description: opts.desc.trim(),
  aliases: [...aliasSet],
  image: imagePath ?? `images/${mapMeta.dir}/${id}.webp`,
  thumbnail: (imagePath ?? `images/${mapMeta.dir}/${id}.webp`).replace(/\.webp$/, '-thumb.webp'),
  zone,
  createdAt: opts.date,
  updatedAt: opts.date,
  needsReview: !opts.noReview,
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
