import { describe, expect, it } from 'vitest'
import lineupsJson from '../data/lineups.json'
import type { Lineup } from '../data/types'
import { lineupTitle } from '../data/types'
import { DEFAULT_FILTERS, searchLineups, tokenize, normalize } from './search'

const all = lineupsJson as Lineup[]
const search = (q: string) => searchLineups(q, all, DEFAULT_FILTERS)

describe('分词（自然句过滤）', () => {
  it('丢掉废话词，只留下有效关键词', () => {
    const tokens = tokenize('我在A大怎么封警家')
    expect(tokens.map((t) => t.canon)).toEqual(['A大', '警家'])
  })

  it('「帮我找Xbox烟」只留下 Xbox 和 烟雾弹', () => {
    const tokens = tokenize('帮我找Xbox烟')
    expect(tokens.map((t) => t.canon)).toEqual(['Xbox', '烟雾弹'])
  })

  it('「CT在B门怎么防B洞Rush」留下 CT / B门 / B洞 / rush', () => {
    const tokens = tokenize('CT在B门怎么防B洞Rush')
    expect(tokens.map((t) => t.canon)).toEqual(['CT', 'B门', 'B洞', 'rush'])
  })

  it('单个常见字「家」不会变成关键词', () => {
    expect(tokenize('家')).toHaveLength(0)
    expect(tokenize('烟')).toHaveLength(1)
  })

  it('英文词边界：the 里的 he 不算手雷', () => {
    expect(tokenize('the').some((t) => t.canon === '手雷')).toBe(false)
  })
})

describe('关键词搜索', () => {
  it('警家烟 能找到警家烟雾弹，并排在闪光弹前面', () => {
    const items = search('警家烟').items
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].lineup.targetLocation).toBe('警家')
    expect(items[0].lineup.grenadeType).toBe('烟雾弹')
  })

  it('CT烟 / 警察家 / 警家 都能命中警家相关点位', () => {
    for (const q of ['CT烟', '警察家', '警家', '警察家烟']) {
      const items = search(q).items
      expect(items.length, `查询「${q}」应有结果`).toBeGreaterThan(0)
      expect(items.some((i) => i.lineup.targetLocation === '警家' || i.lineup.startLocation === '警家')).toBe(true)
    }
  })

  it('A大 显示 A大 相关点位', () => {
    const items = search('A大').items
    expect(items.length).toBeGreaterThanOrEqual(2)
    expect(
      items.every((i) => i.lineup.startLocation.includes('A大') || i.lineup.targetLocation.includes('A大'))
    ).toBe(true)
  })

  it('X箱 能匹配 Xbox', () => {
    const items = search('X箱').items
    expect(items[0].lineup.targetLocation).toBe('Xbox')
  })

  it('跑跳投 只出跑跳投的点位', () => {
    const items = search('跑跳投').items
    expect(items.length).toBe(1)
    expect(items[0].lineup.throwMethod).toBe('跑跳投')
  })

  it('单个「家」字不产生大量错误结果', () => {
    expect(search('家').items).toHaveLength(0)
    expect(search('的').items).toHaveLength(0)
  })

  it('无结果时给出相近关键词建议', () => {
    const res = search('Mirage香蕉道')
    expect(res.items).toHaveLength(0)
    expect(res.suggestions.length).toBeGreaterThan(0)
  })
})

describe('自然句搜索', () => {
  it('我在A大怎么封警家 → 优先 A大 封警家', () => {
    const items = search('我在A大怎么封警家').items
    expect(items.length).toBeGreaterThan(0)
    const top = items[0].lineup
    expect(top.startLocation).toContain('A大')
    expect(top.targetLocation).toBe('警家')
    expect(top.grenadeType).toBe('烟雾弹')
  })

  it('从匪家怎么扔Xbox烟 → 匪家到Xbox的烟', () => {
    const items = search('从匪家怎么扔Xbox烟').items
    expect(items[0].lineup.startLocation).toBe('匪家')
    expect(items[0].lineup.targetLocation).toBe('Xbox')
    expect(items[0].lineup.grenadeType).toBe('烟雾弹')
  })

  it('匪家封中 → 能找到匪家出发的相关烟', () => {
    const items = search('匪家封中').items
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].lineup.startLocation).toBe('匪家')
  })

  it('CT在B门怎么防B洞Rush → 优先 B门防B洞的火', () => {
    const items = search('CT在B门怎么防B洞Rush').items
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].lineup.side).toBe('CT')
    expect(items[0].lineup.targetLocation).toBe('B洞')
    expect(items[0].lineup.grenadeType).toBe('燃烧弹')
  })

  it('帮我找一个中路烟 → 中路/中门相关烟雾弹', () => {
    const items = search('帮我找一个中路烟').items
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].lineup.grenadeType).toBe('烟雾弹')
  })

  it('完全匹配标题排第一', () => {
    const title = lineupTitle(all[0])
    const items = search(title).items
    expect(items[0].lineup.id).toBe(all[0].id)
  })
})

describe('筛选', () => {
  it('阵营筛选只出对应阵营', () => {
    for (const q of ['烟', '闪', '火', '雷']) {
      const items = searchLineups(q, all, { ...DEFAULT_FILTERS, side: 'CT' }).items
      expect(items.every((i) => i.lineup.side === 'CT')).toBe(true)
    }
  })

  it('道具筛选只出对应道具', () => {
    const items = searchLineups('', all, { ...DEFAULT_FILTERS, grenade: '燃烧弹' }).items
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.lineup.grenadeType === '燃烧弹')).toBe(true)
  })

  it('区域筛选只出对应区域', () => {
    const items = searchLineups('', all, { ...DEFAULT_FILTERS, zone: 'B' }).items
    expect(items.every((i) => i.lineup.zone === 'B')).toBe(true)
  })
})

describe('性能与数据完整性', () => {
  it('100 条点位下搜索即时响应', () => {
    const big: Lineup[] = Array.from({ length: 100 }, (_, i) => ({
      ...all[i % all.length],
      id: `${all[i % all.length].id}-${i}`,
    }))
    const t0 = performance.now()
    for (let i = 0; i < 50; i++) searchLineups('我在A大怎么封警家', big, DEFAULT_FILTERS)
    const cost = (performance.now() - t0) / 50
    expect(cost).toBeLessThan(50)
  })

  it('每条点位字段完整', () => {
    for (const l of all) {
      expect(l.id, 'id 不能为空').toBeTruthy()
      expect(['T', 'CT']).toContain(l.side)
      expect(['烟雾弹', '闪光弹', '燃烧弹', '手雷']).toContain(l.grenadeType)
      expect(['站投', '跳投', '跑投', '跑跳投', '蹲投', '其他']).toContain(l.throwMethod)
      expect(l.image).toMatch(/^images\/(dust2|inferno|mirage)\/.+\.webp$/)
      expect(l.aliases.length).toBeGreaterThan(0)
      expect(normalize(l.description).length).toBeGreaterThan(0)
    }
  })

  it('id 唯一', () => {
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length)
  })
})

/* ------------------------------------------------------------------ */
/* 多地图                                                              */
/* ------------------------------------------------------------------ */

const mk = (over: Partial<Lineup>): Lineup => ({
  id: 'x',
  map: 'dust2',
  side: 'T',
  startLocation: '中路',
  targetLocation: '警家',
  grenadeType: '烟雾弹',
  throwMethod: '站投',
  description: '测试用',
  aliases: [],
  image: 'images/dust2/x.webp',
  zone: 'MID',
  createdAt: '2026-09-24',
  updatedAt: '2026-09-24',
  ...over,
})

const multi: Lineup[] = [
  mk({ id: 'd1', map: 'dust2', startLocation: 'B洞', targetLocation: 'B平台', grenadeType: '燃烧弹', zone: 'B' }),
  mk({ id: 'i1', map: 'inferno', startLocation: '香蕉道', targetLocation: '拱门', zone: 'A' }),
  mk({ id: 'm1', map: 'mirage', startLocation: '中路', targetLocation: '拱门', zone: 'MID' }),
  mk({ id: 'm2', map: 'mirage', startLocation: 'B小', targetLocation: 'B平台', grenadeType: '闪光弹', zone: 'B' }),
  mk({ id: 'd2', map: 'dust2', startLocation: 'B1', targetLocation: 'B2' }),
]

describe('地图词', () => {
  it('沙二 / 小镇 / 迷城 / dust2 / inferno / mirage 都能被认出来', () => {
    for (const [q, expectCanon] of [
      ['沙二', 'dust2'],
      ['炽热沙城', 'dust2'],
      ['dust2', 'dust2'],
      ['小镇', 'inferno'],
      ['炼狱小镇', 'inferno'],
      ['迷城', 'mirage'],
      ['荒漠迷城', 'mirage'],
      ['mirage', 'mirage'],
    ] as const) {
      const t = tokenize(q)
      expect(t[0]?.kind, `「${q}」应是地图词`).toBe('map')
      expect(t[0]?.canon).toBe(expectCanon)
    }
  })

  it('说「迷城 拱门」只出迷城的点位', () => {
    const r = searchLineups('迷城 拱门', multi, DEFAULT_FILTERS)
    expect(r.items.map((h) => h.lineup.id)).toEqual(['m1'])
  })

  it('说「小镇 拱门烟」只出小镇的点位', () => {
    const r = searchLineups('小镇 拱门烟', multi, DEFAULT_FILTERS)
    expect(r.items.map((h) => h.lineup.id)).toEqual(['i1'])
  })

  it('地图筛选只保留该图的点位', () => {
    const r = searchLineups('', multi, { ...DEFAULT_FILTERS, map: 'mirage' })
    expect(r.items.map((h) => h.lineup.id).sort()).toEqual(['m1', 'm2'])
  })
})

describe('位置词按地图区分', () => {
  it('「拱门」在两张图里各归各的', () => {
    const r = searchLineups('拱门', multi, DEFAULT_FILTERS)
    expect(r.items.map((h) => h.lineup.id).sort()).toEqual(['i1', 'm1'])
  })

  it('B1 / B2 能当关键词', () => {
    expect(tokenize('b1').map((t) => t.canon)).toEqual(['B1'])
    expect(tokenize('b2').map((t) => t.canon)).toEqual(['B2'])
    const r = searchLineups('B1', multi, DEFAULT_FILTERS)
    expect(r.items.map((h) => h.lineup.id)).toEqual(['d2'])
  })

  it('香蕉道 / B小 / VIP 这类地图专属词能命中', () => {
    expect(searchLineups('香蕉道', multi, DEFAULT_FILTERS).items.map((h) => h.lineup.id)).toEqual(['i1'])
    expect(searchLineups('B小', multi, DEFAULT_FILTERS).items.map((h) => h.lineup.id)).toEqual(['m2'])
  })

  it('通用词（警家 / 中路 / 烟）不做地图限制', () => {
    expect(tokenize('中路')[0].group.maps).toBeUndefined()
    expect(tokenize('警家')[0].group.maps).toBeUndefined()
  })
})
