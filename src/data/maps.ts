/**
 * 地图配置
 * ------------------------------------------------------------------
 * 以后要加新地图，只在这个文件里加一条即可：
 *   1. MapId 联合类型加一个值
 *   2. MAPS 里加一条（含中文名、英文名、简称、图片目录、搜索别名）
 *   3. src/data/synonyms.ts 里给这张图加位置词（带 maps: ['新地图id']）
 *   4. ZONE_MAP 里登记新位置属于 A / MID / B
 */

export type MapId = 'dust2' | 'inferno' | 'mirage'

export interface MapMeta {
  /** 数据里的 id，也用于 URL 参数与图片目录 */
  id: MapId
  /** 中文正式名 */
  name: string
  /** 英文名 */
  enName: string
  /** 筛选条上的短名 */
  short: string
  /** 图片存放目录（public/images/<dir>/） */
  dir: string
  /** 文件名前缀（d2 / inf / mrg） */
  slug: string
  /** 搜索别名：玩家口语都写进来 */
  aliases: string[]
}

export const MAPS: MapMeta[] = [
  {
    id: 'dust2',
    name: '炽热沙城',
    enName: 'Dust II',
    short: '沙二',
    dir: 'dust2',
    slug: 'd2',
    aliases: ['dust2', 'dustii', 'd2', '沙二', '沙2', '沙城', '炽热沙城', '炙热沙城', '热沙城', 'dedust2'],
  },
  {
    id: 'inferno',
    name: '炼狱小镇',
    enName: 'Inferno',
    short: '小镇',
    dir: 'inferno',
    slug: 'inf',
    aliases: ['inferno', 'inf', '小镇', '炼狱小镇', '地狱小镇', 'deinferno'],
  },
  {
    id: 'mirage',
    name: '荒漠迷城',
    enName: 'Mirage',
    short: '迷城',
    dir: 'mirage',
    slug: 'mrg',
    aliases: ['mirage', 'mrg', '迷城', '荒漠迷城', '沙漠迷城', 'demirage'],
  },
]

export const MAP_BY_ID: Record<string, MapMeta> = Object.fromEntries(MAPS.map((m) => [m.id, m]))

/** 地图 id → 显示名，找不到就原样输出，避免脏数据导致界面崩 */
export function mapLabel(id: string): string {
  return MAP_BY_ID[id]?.short ?? id
}

export function mapFullName(id: string): string {
  const m = MAP_BY_ID[id]
  return m ? `${m.enName} · ${m.name}` : id
}

/** 别名 → 地图 id（用于 --map 参数、文件名识别） */
export function findMapId(text: string): MapId | undefined {
  const t = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
  if (!t) return undefined
  for (const m of MAPS) {
    for (const a of m.aliases) {
      const key = a.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
      if (key && t.includes(key)) return m.id
    }
  }
  return undefined
}
