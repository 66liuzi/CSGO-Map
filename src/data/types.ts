/**
 * 点位数据结构定义
 * ------------------------------------------------------------------
 * 这是「数据」与「界面」分离的关键：所有点位内容都写在
 *   src/data/lineups.json
 * 本文件只描述字段格式，界面代码只依赖这些类型，不关心具体点位。
 */

/** 阵营 */
export type Side = 'T' | 'CT'

/** 道具类型 */
export type GrenadeType = '烟雾弹' | '闪光弹' | '燃烧弹' | '手雷'

/** 投掷方法 */
export type ThrowMethod = '站投' | '跳投' | '跑投' | '跑跳投' | '其他'

/** 区域（用于筛选：全部 / A区 / 中路 / B区） */
export type Zone = 'A' | 'MID' | 'B'

export interface Lineup {
  /** 唯一编号，格式建议 d2-<side>-<起点>-<目标>-<道具>-<四位序号> */
  id: string
  /** 地图，固定 Dust II/炽热沙城 */
  map: string
  /** T 或 CT */
  side: Side
  /** 起始位置，例如「A大外」「中门」「匪家」 */
  startLocation: string
  /** 投掷目标，例如「警家」「Xbox」「B洞」 */
  targetLocation: string
  /** 道具类型 */
  grenadeType: GrenadeType
  /** 投掷方法 */
  throwMethod: ThrowMethod
  /** 简短操作说明（一到两句，写清站位与操作） */
  description: string
  /** 搜索别名，越全越好搜 */
  aliases: string[]
  /** 准心瞄点图片（主图，WebP） */
  image: string
  /** 列表用缩略图（WebP），可省略则回退主图 */
  thumbnail?: string
  /** 区域，用于筛选 */
  zone: Zone
  /** 录入日期 YYYY-MM-DD */
  createdAt: string
  /** 最后更新日期 YYYY-MM-DD */
  updatedAt: string
  /** 可选：原始视频或网页来源 */
  source?: string
  /** 是否需要人工确认，例如阵营/起点靠推断得来 */
  needsReview?: boolean
  /** 是否示例数据（示例会在界面上明显标注，可一键删除） */
  isSample?: boolean
}

/** 道具短名：标题里用「警家烟」而不是「警家烟雾弹」 */
export const GRENADE_SHORT: Record<GrenadeType, string> = {
  烟雾弹: '烟',
  闪光弹: '闪',
  燃烧弹: '火',
  手雷: '雷',
}

/** 区域显示名 */
export const ZONE_LABEL: Record<Zone, string> = {
  A: 'A区',
  MID: '中路',
  B: 'B区',
}

/** 卡片 / 详情标题：起始位置 → 投掷目标＋道具 */
export function lineupTitle(l: Lineup): string {
  return `${l.startLocation} → ${l.targetLocation}${GRENADE_SHORT[l.grenadeType] ?? l.grenadeType}`
}
