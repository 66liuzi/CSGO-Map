/**
 * 同义词配置（搜索的词库都从这里来）
 * ------------------------------------------------------------------
 * 以后要加新说法，只改这个文件即可，不需要动搜索算法。
 *
 * 三个概念：
 *  - canon  : 标准词。搜索时命中的词会被归一化成 canon，再和点位字段比对。
 *  - kind   : 词条类型，决定搜索结果排序时的权重（位置 > 道具 > 投法 > 阵营）。
 *  - terms  : 所有写法。小写、不带空格。中英混排都可以。
 *
 * 注意：单字的常见字（如「家」「区」）不要单独放进来，
 *       否则搜索「家」会命中一大堆无关点位。只放「警家」「匪家」这种完整说法。
 */

export type TokenKind = 'location' | 'grenade' | 'method' | 'side' | 'tag'

export interface SynonymGroup {
  /** 标准词（显示与归一化用） */
  canon: string
  kind: TokenKind
  /** 术语别名，含 canon 本身 */
  terms: string[]
}

/** 位置同义组：一个组 = 地图上的同一个点 */
export const LOCATION_GROUPS: SynonymGroup[] = [
  {
    canon: '警家',
    kind: 'location',
    terms: ['警家', '警察家', 'ct家', 'ct出生点', 'ctspawn', 'ct spawn', 'ctbase', 'ct base', '警出生点'],
  },
  {
    canon: '匪家',
    kind: 'location',
    terms: ['匪家', 't家', 't出生点', 'tspawn', 't spawn', 'tbase', 't base', '匪出生点', '匪口', 't口'],
  },
  {
    canon: 'A大',
    kind: 'location',
    terms: ['a大', 'along', 'a long', 'long', 'a门', 'a大外', 'a大道', '大坑', 'a大坑'],
  },
  {
    canon: 'A小',
    kind: 'location',
    terms: ['a小', 'ashort', 'a short', 'short', '小道', 'a小门', '小a'],
  },
  {
    canon: 'A平台',
    kind: 'location',
    terms: ['a平台', 'a台', 'a点', 'asite', 'a site', 'a区', 'a包点'],
  },
  {
    canon: '中路',
    kind: 'location',
    terms: ['中路', '中门', 'mid', 'middoors', 'mid doors', '中央', '中门洞', '中路门'],
  },
  {
    canon: 'B洞',
    kind: 'location',
    terms: ['b洞', 'btunnel', 'b tunnel', 'tunnel', '狗洞', 'b通道'],
  },
  {
    canon: 'B门',
    kind: 'location',
    terms: ['b门', 'b门洞', 'bdoor', 'b door', 'b doors', 'b门外'],
  },
  {
    canon: 'B平台',
    kind: 'location',
    terms: ['b平台', 'b台', 'b点', 'bsite', 'b site', 'b区', 'b包点'],
  },
  {
    canon: 'Xbox',
    kind: 'location',
    terms: ['xbox', 'x箱', 'x-box', '叉箱', 'x箱子', 'x箱上'],
  },
]

/** 道具同义组 */
export const GRENADE_GROUPS: SynonymGroup[] = [
  { canon: '烟雾弹', kind: 'grenade', terms: ['烟雾弹', '烟', '烟雾', 'smoke', 'smokes', '封烟', '烟弹'] },
  { canon: '闪光弹', kind: 'grenade', terms: ['闪光弹', '闪光', '闪', 'flash', 'flashbang', '闪白', '飞白'] },
  {
    canon: '燃烧弹',
    kind: 'grenade',
    terms: ['燃烧弹', '燃烧瓶', '火', 'molly', 'molotov', 'incendiary', '火瓶', '烧'],
  },
  { canon: '手雷', kind: 'grenade', terms: ['手雷', '手榴弹', '雷', 'he', 'hegrenade', 'he grenade', '炸雷'] },
]

/** 投掷方法同义组（长的写前面，匹配时按最长优先） */
export const METHOD_GROUPS: SynonymGroup[] = [
  {
    canon: '跑跳投',
    kind: 'method',
    terms: ['跑跳投', '跑跳投掷', 'runjumpthrow', 'run jump throw', '跑跳'],
  },
  { canon: '站投', kind: 'method', terms: ['站投', '原地投', '站立投', '站姿', '站扔', 'static', 'standing'] },
  { canon: '跳投', kind: 'method', terms: ['跳投', '跳着投', '跳起投', 'jumpthrow', 'jump throw', 'jt'] },
  { canon: '跑投', kind: 'method', terms: ['跑投', '跑着投', '助跑投', '移动投', 'runthrow', 'run throw'] },
]

/** 阵营同义组 */
export const SIDE_GROUPS: SynonymGroup[] = [
  {
    canon: 'T',
    kind: 'side',
    terms: ['t', 't方', '匪', '匪方', '匪徒', '恐怖分子', 'terrorist', 'terrorists', 'tside', 't side'],
  },
  {
    canon: 'CT',
    kind: 'side',
    terms: [
      'ct',
      'ct方',
      '警',
      '警方',
      '警察',
      '反恐',
      'counterterrorist',
      'cts',
      'ctside',
      'ct side',
    ],
  },
]

/** 其他可搜索的标签词（不参与字段比对，只用于加权） */
export const TAG_GROUPS: SynonymGroup[] = [
  {
    canon: 'rush',
    kind: 'tag',
    terms: ['rush', '快攻', '冲点', '打rush', '防rush', '防快攻', 'rush防', '快rush', 'rush点'],
  },
]

export const ALL_GROUPS: SynonymGroup[] = [
  ...LOCATION_GROUPS,
  ...GRENADE_GROUPS,
  ...METHOD_GROUPS,
  ...SIDE_GROUPS,
  ...TAG_GROUPS,
]

/**
 * 自然句里的废话词，搜索时直接忽略。
 * 例如「我在A大怎么封警家」→ 只留下 A大 / 警家。
 */
export const STOPWORDS: string[] = [
  // 人称与语气
  '我在',
  '我们',
  '我的',
  '怎么',
  '怎样',
  '怎么样',
  '如何',
  '为什么',
  '有没有',
  '有没',
  '是不是',
  '能不能',
  '可以',
  '帮我',
  '帮忙',
  '帮我找',
  '帮我看',
  '帮我查',
  '给我',
  '给我看',
  '给我找',
  '我想',
  '想看',
  '求',
  '请',
  '问一下',
  '问下',
  '求一个',
  '哪里有',
  '哪里',
  '哪儿',
  '有吗',
  '是什么',
  // 动作与语气助词
  '用什么',
  '用啥',
  '扔一个',
  '丢一个',
  '投一个',
  '扔',
  '丢',
  '投掷',
  '投',
  '封',
  '挡',
  '打',
  '去',
  '到',
  '从',
  '在',
  '往',
  '这',
  '那',
  '个',
  '一下',
  '一个',
  '的',
  '了',
  '吗',
  '呢',
  '啊',
  '吧',
  '最',
  '好',
  '看',
  '看看',
  '找',
  '找个',
  '查找',
  '查',
  '搜索',
  '搜',
  '有',
  '是',
  '要',
  '想',
  // 领域相关但无区分度的词
  'cs2',
  'csgo',
  'dust2',
  'dust',
  'd2',
  '沙城',
  '炽热沙城',
  '地图',
  '点位',
  '点',
  '教学',
  '教程',
  '图片',
  '图',
  '准心',
  '瞄点',
  '瞄',
  '瞄准',
  '学习',
  '新手',
  '方法',
  '技巧',
  'lineup',
  'lineups',
  'nade',
  'nades',
  'grenade',
]

/** 每个点位区域归属：位置组 → 筛选区域。以后加新位置在这里登记即可。 */
export const ZONE_MAP: Record<string, 'A' | 'MID' | 'B'> = {
  警家: 'A',
  A大: 'A',
  A小: 'A',
  A平台: 'A',
  // 匪家（T 出生点）出发的道具基本都走中路/中门方向，归到中路区便于筛选
  匪家: 'MID',
  中路: 'MID',
  Xbox: 'MID',
  B洞: 'B',
  B门: 'B',
  B平台: 'B',
}
