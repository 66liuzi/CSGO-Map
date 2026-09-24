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
      expect(['站投', '跳投', '跑投', '跑跳投', '其他']).toContain(l.throwMethod)
      expect(l.image).toMatch(/^images\/dust2\/.+\.webp$/)
      expect(l.aliases.length).toBeGreaterThan(0)
      expect(normalize(l.description).length).toBeGreaterThan(0)
    }
  })

  it('id 唯一', () => {
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length)
  })
})
