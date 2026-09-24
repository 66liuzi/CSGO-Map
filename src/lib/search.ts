/**
 * 搜索核心：分词 → 打分 → 排序
 * ------------------------------------------------------------------
 * 设计要点（对应需求第七节）：
 *  1. 只认「词库里的词」，不做模糊单字匹配，所以搜「家」不会命中一片无关点位。
 *  2. 分词时自动丢掉自然句里的废话词（我在 / 怎么 / 有没有 / 帮我找 ...）。
 *  3. 排序权重：完全匹配 > 起点+目标同时命中 > 目标 > 起点 > 道具 > 投法 > 说明。
 *  4. 词库来自 src/data/synonyms.ts，加词只改那个文件。
 */
import type { GrenadeType, Lineup, Side, Zone } from '../data/types'
import { GRENADE_SHORT, lineupTitle } from '../data/types'
import type { MapId } from '../data/maps'
import { ALL_GROUPS, STOPWORDS, type SynonymGroup, type TokenKind } from '../data/synonyms'

/* ------------------------------------------------------------------ */
/* 归一化                                                              */
/* ------------------------------------------------------------------ */

/** 只保留中英文与数字，去掉标点、空格、emoji，统一小写 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)) // 全角转半角
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
}

const isCjk = (c: string) => /[\u4e00-\u9fff]/.test(c)
const isAlnum = (c: string) => /[a-z0-9]/.test(c)

/* ------------------------------------------------------------------ */
/* 词库索引                                                            */
/* ------------------------------------------------------------------ */

interface Term {
  raw: string
  canon: string
  kind: TokenKind
  group: SynonymGroup
  /** 是否纯英文数字词（需要用词边界匹配，避免 the 里的 he 被当成手雷） */
  latin: boolean
}

/** 词库索引：按术语长度从长到短，保证「跑跳投」优先于「跳投」 */
const TERM_INDEX: Term[] = (() => {
  const terms: Term[] = []
  for (const group of ALL_GROUPS) {
    for (const raw of group.terms) {
      const norm = normalize(raw)
      if (!norm) continue
      terms.push({
        raw: norm,
        canon: group.canon,
        kind: group.kind,
        group,
        latin: !isCjk(norm),
      })
    }
  }
  return terms.sort((a, b) => b.raw.length - a.raw.length)
})()

/**
 * 同一个写法可能属于多个同义组（例如「拱门」在小镇和迷城都有）。
 * 通用组（没写 maps 的）排前面，地图专属的排后面；匹配时再按点位所属地图挑。
 */
const TERM_TO_GROUPS: Map<string, SynonymGroup[]> = (() => {
  const m = new Map<string, SynonymGroup[]>()
  for (const term of TERM_INDEX) {
    const list = m.get(term.raw) ?? []
    if (!list.includes(term.group)) list.push(term.group)
    m.set(term.raw, list)
  }
  for (const list of m.values()) {
    list.sort((a, b) => (a.maps ? 1 : 0) - (b.maps ? 1 : 0))
  }
  return m
})()

/** 某个写法在指定地图下应该用哪些同义组 */
function groupsForTermInMap(raw: string, map: string): SynonymGroup[] {
  const all = TERM_TO_GROUPS.get(raw) ?? []
  const scoped = all.filter((g) => !g.maps || g.maps.includes(map as MapId))
  return scoped.length ? scoped : all
}

const STOP_SET = new Set(STOPWORDS.map(normalize).filter(Boolean))
/** 长词优先的废话词表，便于「帮我找」整体吃掉 */
const STOP_LIST = [...STOP_SET].sort((a, b) => b.length - a.length)

/* ------------------------------------------------------------------ */
/* 分词                                                                */
/* ------------------------------------------------------------------ */

export interface QueryToken {
  raw: string
  canon: string
  kind: TokenKind
  group: SynonymGroup
}

/** 该位置的英文词是否处于词边界（前后不是字母数字） */
function latinBoundaryOk(text: string, index: number, len: number): boolean {
  const before = index > 0 ? text[index - 1] : ''
  const after = index + len < text.length ? text[index + len] : ''
  if (before && isAlnum(before)) return false
  if (after && isAlnum(after)) return false
  return true
}

/** 把自然句切成词库里的词 */
export function tokenize(input: string): QueryToken[] {
  const text = normalize(input)
  const tokens: QueryToken[] = []
  let i = 0

  while (i < text.length) {
    let matched = false

    // 1) 词库最长匹配
    for (const term of TERM_INDEX) {
      if (!text.startsWith(term.raw, i)) continue
      if (term.latin && !latinBoundaryOk(text, i, term.raw.length)) continue
      const last = tokens[tokens.length - 1]
      // 同一个词重复出现只算一次
      if (!last || !(last.raw === term.raw && last.kind === term.kind)) {
        tokens.push({ raw: term.raw, canon: term.canon, kind: term.kind, group: term.group })
      }
      i += term.raw.length
      matched = true
      break
    }
    if (matched) continue

    // 2) 废话词整体跳过（「我在」「帮我找」等）
    const stop = STOP_LIST.find((s) => text.startsWith(s, i))
    if (stop) {
      i += stop.length
      continue
    }

    // 3) 英文/数字串：整串是词就用，否则丢掉（避免 the → he）
    if (isAlnum(text[i])) {
      let j = i
      while (j < text.length && isAlnum(text[j])) j++
      const run = text.slice(i, j)
      // 整串命中词库（如 ctspawn / middoors）已在步骤 1 覆盖，这里只处理生词
      if (run.length >= 2 && !STOP_SET.has(run)) {
        tokens.push({ raw: run, canon: run, kind: 'tag', group: { canon: run, kind: 'tag', terms: [run] } })
      }
      i = j
      continue
    }

    // 4) 其他字符（含无法组成词的中文单字）直接丢弃 —— 这是「不因单个家字乱匹配」的关键
    i += 1
  }

  return tokens
}

/* ------------------------------------------------------------------ */
/* 字段匹配                                                            */
/* ------------------------------------------------------------------ */

/**
 * 一个词的任意写法出现在字段里 → 命中。
 * 只做「字段包含词」这一个方向（例如字段「A大外」包含词「a大」），
 * 绝不做反向包含，否则「跑跳投」会把「跳投」的点位也捞出来。
 */
function groupHitsField(group: SynonymGroup, field: string): boolean {
  const f = normalize(field)
  if (!f) return false
  return group.terms.some((t) => {
    const term = normalize(t)
    if (!term || term.length < 2) return false
    return f.includes(term)
  })
}

const sideHits = (l: Lineup, side: string) => normalize(l.side) === normalize(side)

export interface Hit {
  lineup: Lineup
  score: number
  /** 命中了哪些维度，用于调试与展示 */
  hits: {
    titleExact: boolean
    aliasExact: boolean
    aliasAll: boolean
    target: boolean
    start: boolean
    grenade: boolean
    method: boolean
    side: boolean
    description: boolean
    tags: string[]
  }
}

/** 展示用标题（起始 → 目标＋道具） */
export const titleOf = lineupTitle

/** 完整别名词组（含标题本身） */
export function allAliases(l: Lineup): string[] {
  return [lineupTitle(l), ...l.aliases]
}

/** 单条点位打分 */
export function scoreLineup(l: Lineup, tokens: QueryToken[], compactQuery: string): Hit | null {
  const hits: Hit['hits'] = {
    titleExact: false,
    aliasExact: false,
    aliasAll: false,
    target: false,
    start: false,
    grenade: false,
    method: false,
    side: false,
    description: false,
    tags: [],
  }

  const aliases = allAliases(l).map(normalize).filter(Boolean)
  const desc = normalize(l.description)

  if (compactQuery) {
    if (normalize(lineupTitle(l)) === compactQuery) hits.titleExact = true
    if (aliases.some((a) => a === compactQuery)) hits.aliasExact = true
  }

  if (tokens.length === 0) {
    // 没有有效词 → 只有完全匹配才有结果（避免空查询刷屏）
    if (!hits.titleExact && !hits.aliasExact) return null
    return { lineup: l, score: hits.titleExact ? 10000 : 8000, hits }
  }

  const startIdx = new Set<number>()
  const targetIdx = new Set<number>()
  const matchedIdx = new Set<number>()

  tokens.forEach((tk, idx) => {
    switch (tk.kind) {
      case 'location': {
        // 同一个词在不同地图意思不同（拱门 / 下水道 / 死点 …），按点位所属地图挑词库
        const groups = groupsForTermInMap(tk.raw, l.map)
        const onStart = groups.some((g) => groupHitsField(g, l.startLocation))
        const onTarget = groups.some((g) => groupHitsField(g, l.targetLocation))
        if (onStart) startIdx.add(idx)
        if (onTarget) targetIdx.add(idx)
        if (onStart || onTarget) matchedIdx.add(idx)
        break
      }
      case 'map': {
        // 说了「迷城」「小镇」就只看那张图
        if (tk.canon === l.map) matchedIdx.add(idx)
        break
      }
      case 'grenade':
        if (grenadeHits(tk.canon, l.grenadeType)) matchedIdx.add(idx)
        break
      case 'method':
        if (normalize(tk.canon) === normalize(l.throwMethod) || groupHitsField(tk.group, l.throwMethod)) {
          matchedIdx.add(idx)
        }
        break
      case 'side':
        if (sideHits(l, tk.canon)) matchedIdx.add(idx)
        break
      case 'tag': {
        // 标签词（rush 等）与生词：只看别名 + 位置 + 说明
        const inAlias = aliases.some((a) => a.includes(tk.raw))
        const inDesc = desc.includes(tk.raw)
        const inField =
          normalize(l.targetLocation).includes(tk.raw) || normalize(l.startLocation).includes(tk.raw)
        if (inAlias || inDesc || inField) {
          hits.tags.push(tk.canon)
          matchedIdx.add(idx)
        }
        break
      }
    }
  })

  if (matchedIdx.size === 0) return null

  // 说了某张图，就不是那张图的点位直接淘汰（「迷城 烟」不该出沙二的烟）
  const mapTokens = tokens.filter((t) => t.kind === 'map')
  if (mapTokens.length && !mapTokens.some((t) => t.canon === l.map && matchedIdx.has(tokens.indexOf(t)))) {
    return null
  }
  // 除了地图词之外还得有别的词命中，否则「迷城」会把该图全部点位刷出来
  if (mapTokens.length < tokens.length) {
    const anyReal = tokens.some((t, idx) => t.kind !== 'map' && matchedIdx.has(idx))
    if (!anyReal) return null
  }

  const locTokenCount = tokens.filter((t) => t.kind === 'location').length
  hits.start = startIdx.size > 0
  hits.target = targetIdx.size > 0
  hits.grenade = tokens.some((t, i) => t.kind === 'grenade' && matchedIdx.has(i))
  hits.method = tokens.some((t, i) => t.kind === 'method' && matchedIdx.has(i))
  hits.side = tokens.some((t, i) => t.kind === 'side' && matchedIdx.has(i))

  // 某个别名同时包含全部关键词（例如别名「警家烟」 vs 搜索「警家」+「烟」）
  if (tokens.length > 1) {
    const all = tokens.map((t) => t.raw)
    hits.aliasAll = aliases.some((a) => all.every((t) => a.includes(t)))
  }

  const sameTokenBothSides =
    startIdx.size === 1 &&
    targetIdx.size === 1 &&
    [...startIdx][0] === [...targetIdx][0]

  let score = 0
  if (hits.titleExact) score += 10000
  if (hits.aliasExact) score += 8000

  // 位置：一个位置词同时命中起点和目标时（例如点位全程在中路），只按目标那一档算，
  // 避免「中路手雷」这种点位在搜「中路烟」时压过真正的烟雾弹点位。
  if (hits.target) score += 1200
  if (hits.start && !sameTokenBothSides) score += 900
  // 起点和目标由不同的关键词分别命中，才算「起点+目标同时匹配」
  if (locTokenCount >= 2 && hits.start && hits.target && !sameTokenBothSides) score += 3000

  if (hits.aliasAll) score += 1500
  // 搜索里带了地图名（「迷城 拱门烟」）→ 命中的图排前面
  if (mapTokens.length && mapTokens.some((t) => t.canon === l.map)) score += 900
  if (hits.grenade) score += 700
  if (hits.method) score += 500
  if (hits.side) score += 300
  score += hits.tags.length * 250
  score += Math.round(1000 * (matchedIdx.size / tokens.length))

  // 说明文字里的兜底匹配（只加权，不单独构成命中）
  if (tokens.some((t) => desc.includes(t.raw) && t.raw.length >= 2)) {
    hits.description = true
    score += 100
  }

  return { lineup: l, score, hits }
}

/** 道具命中：支持「烟雾弹」这类标准词与单字（烟/闪/火/雷） */
function grenadeHits(canon: string, type: GrenadeType): boolean {
  if (canon === type) return true
  return GRENADE_SHORT[type] === canon
}

/** 单条点位的区域（在数据里显式写了 zone，筛选直接比对） */

/* ------------------------------------------------------------------ */
/* 对外搜索接口                                                        */
/* ------------------------------------------------------------------ */

export interface Filters {
  map: MapId | 'ALL'
  side: Side | 'ALL'
  grenade: GrenadeType | 'ALL'
  zone: Zone | 'ALL'
}

export const DEFAULT_FILTERS: Filters = { map: 'ALL', side: 'ALL', grenade: 'ALL', zone: 'ALL' }

/** 低于这个分数视为无关，不显示 */
const MIN_SCORE = 500

export interface SearchResult {
  query: string
  tokens: QueryToken[]
  items: Hit[]
  /** 没有结果时给出的相近关键词建议 */
  suggestions: string[]
}

export function searchLineups(rawQuery: string, all: Lineup[], filters: Filters = DEFAULT_FILTERS): SearchResult {
  const tokens = tokenize(rawQuery)
  const compact = normalize(rawQuery)
  const pool = all.filter(
    (l) =>
      (filters.map === 'ALL' || l.map === filters.map) &&
      (filters.side === 'ALL' || l.side === filters.side) &&
      (filters.grenade === 'ALL' || l.grenadeType === filters.grenade) &&
      (filters.zone === 'ALL' || l.zone === filters.zone)
  )

  let items: Hit[] = []
  if (!rawQuery.trim()) {
    // 空查询：显示（筛选后的）全部点位，方便浏览
    items = pool.map((l) => ({ lineup: l, score: 1, hits: emptyHits() }))
  } else {
    items = pool
      .map((l) => {
        const hit = scoreLineup(l, tokens, compact)
        if (!hit) return null
        // 单薄命中（只命中生词/单个 tag）不给展示名额
        return hit
      })
      .filter((h): h is Hit => !!h && h.score >= MIN_SCORE)
  }

  items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // 同分：先看有没有人工确认过，再按更新日期排
    const ra = a.lineup.needsReview ? 1 : 0
    const rb = b.lineup.needsReview ? 1 : 0
    if (ra !== rb) return ra - rb
    return (b.lineup.updatedAt || '').localeCompare(a.lineup.updatedAt || '')
  })

  return {
    query: rawQuery,
    tokens,
    items,
    suggestions: items.length === 0 ? buildSuggestions(tokens, pool) : [],
  }
}

function emptyHits(): Hit['hits'] {
  return {
    titleExact: false,
    aliasExact: false,
    aliasAll: false,
    target: false,
    start: false,
    grenade: false,
    method: false,
    side: false,
    description: false,
    tags: [],
  }
}

/** 没搜到时给几个「相近关键词」 */
export function buildSuggestions(tokens: QueryToken[], pool: Lineup[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const push = (s: string) => {
    if (!s || seen.has(s)) return
    seen.add(s)
    out.push(s)
  }

  // 先给「目标＋道具」这种最好搜的组合
  for (const l of pool) {
    push(`${l.targetLocation}${GRENADE_SHORT[l.grenadeType]}`)
    if (out.length >= 4) break
  }
  // 再按搜索到的关键词补位置
  for (const t of tokens) {
    if (t.kind === 'location') push(t.canon)
  }
  for (const l of pool) {
    push(l.startLocation)
    if (out.length >= 8) break
  }
  return out.slice(0, 8)
}

/** 所有图片地址（离线缓存全部点位时用） */
export function allImageUrls(lineups: Lineup[], base: string): string[] {
  const urls = new Set<string>()
  for (const l of lineups) {
    urls.add(base + l.image.replace(/^\//, ''))
    if (l.thumbnail) urls.add(base + l.thumbnail.replace(/^\//, ''))
  }
  return [...urls]
}
