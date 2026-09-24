/**
 * 同义词配置（搜索的词库都从这里来）
 * ------------------------------------------------------------------
 * 以后要加新说法，只改这个文件即可，不需要动搜索算法。
 *
 * 四个概念：
 *  - canon  : 标准词。搜索时命中的词会被归一化成 canon，再和点位字段比对。
 *  - kind   : 词条类型，决定搜索结果排序时的权重（地图 > 位置 > 道具 > 投法 > 阵营）。
 *  - terms  : 所有写法。小写、不带空格。中英混排都可以。
 *  - maps   : 只在哪些地图里生效。不填 = 三张图通用。
 *             同一个词在不同图里意思不同时（例如「拱门」小镇和迷城都有），
 *             就写两条同 canon 的词条，各自带 maps，搜索会按点位所属地图自动选。
 *
 * 注意：单字的常见字（如「家」「区」）不要单独放进来，
 *       否则搜索「家」会命中一大堆无关点位。只放「警家」「匪家」这种完整说法。
 */
import type { MapId } from './maps'

export type TokenKind = 'location' | 'grenade' | 'method' | 'side' | 'tag' | 'map'

export interface SynonymGroup {
  /** 标准词（显示与归一化用） */
  canon: string
  kind: TokenKind
  /** 术语别名，含 canon 本身 */
  terms: string[]
  /** 限定地图；不填 = 所有地图通用 */
  maps?: MapId[]
}

/* ------------------------------------------------------------------ */
/* 地图                                                                */
/* ------------------------------------------------------------------ */

export const MAP_GROUPS: SynonymGroup[] = [
  {
    canon: 'dust2',
    kind: 'map',
    terms: ['dust2', 'dustii', 'd2', '沙二', '沙2', '沙城', '炽热沙城', '炙热沙城', '热沙城', 'dedust2'],
  },
  {
    canon: 'inferno',
    kind: 'map',
    terms: ['inferno', 'inf', '小镇', '炼狱小镇', '地狱小镇', 'deinferno'],
  },
  {
    canon: 'mirage',
    kind: 'map',
    terms: ['mirage', 'mrg', '迷城', '荒漠迷城', '沙漠迷城', 'demirage'],
  },
]

/* ------------------------------------------------------------------ */
/* 位置（按地图分组）                                                   */
/* ------------------------------------------------------------------ */

/** 三张图通用的位置 */
const COMMON_LOCATIONS: SynonymGroup[] = [
  {
    canon: '警家',
    kind: 'location',
    terms: ['警家', '警察家', 'ct家', 'ct出生点', 'ctspawn', 'ct spawn', 'ctbase', 'ct base', '警出生点', '警口'],
  },
  {
    canon: '匪家',
    kind: 'location',
    terms: ['匪家', 't家', 't出生点', 'tspawn', 't spawn', 'tbase', 't base', '匪出生点', '匪口', 't口'],
  },
  {
    canon: 'A平台',
    kind: 'location',
    terms: ['a平台', 'a台', 'a点', 'asite', 'a site', 'a区', 'a包点', 'a包点区'],
  },
  {
    canon: 'B平台',
    kind: 'location',
    terms: ['b平台', 'b台', 'b点', 'bsite', 'b site', 'b区', 'b包点', 'b包点区'],
  },
  {
    canon: '中路',
    kind: 'location',
    terms: ['中路', '中门', 'mid', 'middoors', 'mid doors', '中央', '中门洞', '中路门', '中间'],
  },
]

/** 炽热沙城 Dust II */
const DUST2_LOCATIONS: SynonymGroup[] = [
  {
    canon: 'A大',
    kind: 'location',
    terms: ['a大', 'along', 'a long', 'long', 'a门', 'a大外', 'a大道', 'a大门', '长a'],
    maps: ['dust2'],
  },
  {
    canon: 'A小',
    kind: 'location',
    terms: ['a小', 'ashort', 'a short', 'short', '小道', 'a小门', '小a', 'a小楼梯'],
    maps: ['dust2'],
  },
  {
    canon: '坑',
    kind: 'location',
    terms: ['坑', 'a坑', 'a大坑', '大坑', 'pit', '坑里', '坑位', 'a坑位'],
    maps: ['dust2'],
  },
  {
    canon: 'B洞',
    kind: 'location',
    terms: ['b洞', 'btunnel', 'b tunnel', 'tunnel', '狗洞', 'b通道', 'b洞里'],
    maps: ['dust2'],
  },
  {
    canon: 'B门',
    kind: 'location',
    terms: ['b门', 'b门洞', 'bdoor', 'b door', 'b doors', 'b门外', 'b门里'],
    maps: ['dust2'],
  },
  {
    canon: 'Xbox',
    kind: 'location',
    terms: ['xbox', 'x箱', 'x-box', '叉箱', 'x箱子', 'x箱上', '叉箱子'],
    maps: ['dust2'],
  },
  {
    canon: 'B1',
    kind: 'location',
    terms: ['b1', 'b一层', 'b1层', 'b1楼', 'b下层', 'b1下', 'b洞一层'],
    maps: ['dust2'],
  },
  {
    canon: 'B2',
    kind: 'location',
    terms: ['b2', 'b二层', 'b2层', 'b2楼', 'b上层', 'b2上', 'b洞二层', 'b通'],
    maps: ['dust2'],
  },
  {
    canon: '车',
    kind: 'location',
    terms: ['车', '白车', '蓝车', '黄车', '卡车', 'car', '车位'],
    maps: ['dust2'],
  },
  {
    canon: '油桶',
    kind: 'location',
    terms: ['油桶', '蓝油桶', 'a大门油桶', 'a门油桶', 'barrel', '油桶位'],
    maps: ['dust2'],
  },
  {
    canon: '后花园',
    kind: 'location',
    terms: ['后花园', '警家后花园', 'ct花园', 'ct后花园', 'backgarden'],
    maps: ['dust2'],
  },
  {
    canon: '狙位',
    kind: 'location',
    terms: ['狙位', 'b狙位', 'b点狙位', '狙位平台', 'sniperspot'],
    maps: ['dust2'],
  },
  {
    canon: '狗位',
    kind: 'location',
    terms: ['狗位', 'b狗位', '狗窝', 'doghouse'],
    maps: ['dust2'],
  },
  {
    canon: '假门',
    kind: 'location',
    terms: ['假门', 'b假门', 'fakedoor', '假门口'],
    maps: ['dust2'],
  },
]

/** 炼狱小镇 Inferno */
const INFERNO_LOCATIONS: SynonymGroup[] = [
  {
    canon: '香蕉道',
    kind: 'location',
    terms: ['香蕉道', '香蕉', 'banana', '香蕉口', '香蕉道口', '上香蕉', '下香蕉', 'banan', '香蕉道车'],
    maps: ['inferno'],
  },
  {
    canon: '车',
    kind: 'location',
    terms: ['车', '木桶', 'car', '香蕉道车', '车道'],
    maps: ['inferno'],
  },
  {
    canon: '沙袋',
    kind: 'location',
    terms: ['沙袋', 'sandbags', '沙包', '沙袋位'],
    maps: ['inferno'],
  },
  {
    canon: '树位',
    kind: 'location',
    terms: ['树位', 'logs', '木头', '木堆', '木头堆'],
    maps: ['inferno'],
  },
  {
    canon: '一箱',
    kind: 'location',
    terms: ['一箱', 'first', '一柱', 'firstpillar', '第一个箱子'],
    maps: ['inferno'],
  },
  {
    canon: '二箱',
    kind: 'location',
    terms: ['二箱', 'second', '二柱', '第二个箱子'],
    maps: ['inferno'],
  },
  {
    canon: '三箱',
    kind: 'location',
    terms: ['三箱', 'newbox', 'new box', '三柱', '新箱', '第三个箱子'],
    maps: ['inferno'],
  },
  {
    canon: '棺材',
    kind: 'location',
    terms: ['棺材', 'coffin', '棺材位', '棺材后'],
    maps: ['inferno'],
  },
  {
    canon: '喷泉',
    kind: 'location',
    terms: ['喷泉', 'fountain'],
    maps: ['inferno'],
  },
  {
    canon: '死点',
    kind: 'location',
    terms: ['死点', 'dark', '死点包', 'b死点', 'b区死点'],
    maps: ['inferno'],
  },
  {
    canon: '花园',
    kind: 'location',
    terms: ['花园', '后花园', '花坛', 'garden', '花坛位'],
    maps: ['inferno'],
  },
  {
    canon: '锅炉房',
    kind: 'location',
    terms: ['锅炉房', '锅炉', 'boiler', '锅炉房位'],
    maps: ['inferno'],
  },
  {
    canon: '侧道',
    kind: 'location',
    terms: ['侧道', 'secondmid', '第二中路', 'backalley', '侧道小路', '小路', '侧门'],
    maps: ['inferno'],
  },
  {
    canon: '下水道',
    kind: 'location',
    terms: ['下水道', 'underpass', '地道', '下水道口'],
    maps: ['inferno'],
  },
  {
    canon: '拱门',
    kind: 'location',
    terms: ['拱门', 'arch', '拱门下'],
    maps: ['inferno'],
  },
  {
    canon: '大坑',
    kind: 'location',
    terms: ['大坑', 'pit', '坑里', '坑'],
    maps: ['inferno'],
  },
  {
    canon: '小坑',
    kind: 'location',
    terms: ['小坑', 'smallpit', 'minipit', '小坑位'],
    maps: ['inferno'],
  },
  {
    canon: '墓地',
    kind: 'location',
    terms: ['墓地', 'graveyard', 'grave', '墓碑'],
    maps: ['inferno'],
  },
  {
    canon: '教堂',
    kind: 'location',
    terms: ['教堂', 'church'],
    maps: ['inferno'],
  },
  {
    canon: '书房',
    kind: 'location',
    terms: ['书房', '图书馆', 'library', 'lib', '书房位'],
    maps: ['inferno'],
  },
  {
    canon: 'A二楼',
    kind: 'location',
    terms: ['a二楼', 'a2楼', '公寓', 'apts', 'apartment', 'a公寓', 'a二楼阳台', '匪二楼'],
    maps: ['inferno'],
  },
  {
    canon: '阳台',
    kind: 'location',
    terms: ['阳台', 'balcony', '下阳台'],
    maps: ['inferno'],
  },
  {
    canon: '草车',
    kind: 'location',
    terms: ['草车', 'truck', '草车位'],
    maps: ['inferno'],
  },
  {
    canon: '长廊',
    kind: 'location',
    terms: ['长廊', 'speedway', '警家长廊'],
    maps: ['inferno'],
  },
  {
    canon: '凹槽',
    kind: 'location',
    terms: ['凹槽', 'cubby', '连接凹槽'],
    maps: ['inferno'],
  },
  {
    canon: '马棚',
    kind: 'location',
    terms: ['马棚', 'roof', '马棚位'],
    maps: ['inferno'],
  },
]

/** 荒漠迷城 Mirage */
const MIRAGE_LOCATIONS: SynonymGroup[] = [
  {
    canon: 'A1',
    kind: 'location',
    terms: ['a1', 'a门', 'amain', 'a斜坡', '斜坡', 'aramp', 'a大', 'a口'],
    maps: ['mirage'],
  },
  {
    canon: 'A二楼',
    kind: 'location',
    terms: ['a二楼', 'a2楼', '宫殿', 'palace', 'pal', 'a2', 'a二楼楼梯', 'a二楼柱子'],
    maps: ['mirage'],
  },
  {
    canon: '跳台',
    kind: 'location',
    terms: ['跳台', 'stairs', '楼梯', 'a楼梯', '跳台下', '跳台上'],
    maps: ['mirage'],
  },
  {
    canon: '忍者位',
    kind: 'location',
    terms: ['忍者位', 'ninja', '忍者'],
    maps: ['mirage'],
  },
  {
    canon: '死点',
    kind: 'location',
    terms: ['死点', 'default', 'a死点', 'a默认包', '默认包'],
    maps: ['mirage'],
  },
  {
    canon: '三明治',
    kind: 'location',
    terms: ['三明治', 'sandwich'],
    maps: ['mirage'],
  },
  {
    canon: '长箱',
    kind: 'location',
    terms: ['长箱', '短箱', 'firebox', '箱子'],
    maps: ['mirage'],
  },
  {
    canon: '售票亭',
    kind: 'location',
    terms: ['售票亭', 'ticket', 'ticketbooth', '售票处'],
    maps: ['mirage'],
  },
  {
    canon: '垃圾桶',
    kind: 'location',
    terms: ['垃圾桶', 'trash', '垃圾箱', '桶'],
    maps: ['mirage'],
  },
  {
    canon: '拱门',
    kind: 'location',
    terms: ['拱门', 'connector', 'cons', '连接', '拱门烟', '连接处'],
    maps: ['mirage'],
  },
  {
    canon: 'VIP',
    kind: 'location',
    terms: ['vip', '狙位', '窗口', 'window', 'sniper', 'vip下', 'vip窗口'],
    maps: ['mirage'],
  },
  {
    canon: '小黑屋',
    kind: 'location',
    terms: ['小黑屋', 'ladder', '梯子房', '梯子', '梯子间'],
    maps: ['mirage'],
  },
  {
    canon: '下水道',
    kind: 'location',
    terms: ['下水道', 'underpass', '地道', '下水道口'],
    maps: ['mirage'],
  },
  {
    canon: '超市',
    kind: 'location',
    terms: ['超市', 'market', '市场', 'shop', '超市窗口', '超市大门'],
    maps: ['mirage'],
  },
  {
    canon: '厨房',
    kind: 'location',
    terms: ['厨房', 'kitchen'],
    maps: ['mirage'],
  },
  {
    canon: 'B二楼',
    kind: 'location',
    terms: ['b二楼', 'b2楼', '公寓', 'apts', 'apartment', 'bapts', 'b公寓', '匪二楼'],
    maps: ['mirage'],
  },
  {
    canon: '沙发',
    kind: 'location',
    terms: ['沙发', 'furniture', '沙发位', 'b沙发'],
    maps: ['mirage'],
  },
  {
    canon: '白车',
    kind: 'location',
    terms: ['白车', 'van', '车', '面包车', '白车位'],
    maps: ['mirage'],
  },
  {
    canon: 'B小',
    kind: 'location',
    terms: ['b小', 'b小道', 'short', 'catwalk', 'cat', 'bshort', 'b小过点', 'b小楼梯'],
    maps: ['mirage'],
  },
  {
    canon: '长椅',
    kind: 'location',
    terms: ['长椅', '长凳', 'bench'],
    maps: ['mirage'],
  },
  {
    canon: '草车',
    kind: 'location',
    terms: ['草车', 'cart', '沙袋', '中路草车'],
    maps: ['mirage'],
  },
]

/** 位置同义组：一个组 = 地图上的同一个点 */
export const LOCATION_GROUPS: SynonymGroup[] = [
  ...COMMON_LOCATIONS,
  ...DUST2_LOCATIONS,
  ...INFERNO_LOCATIONS,
  ...MIRAGE_LOCATIONS,
]

/** 道具同义组 */
export const GRENADE_GROUPS: SynonymGroup[] = [
  {
    canon: '烟雾弹',
    kind: 'grenade',
    terms: ['烟雾弹', '烟', '烟雾', 'smoke', 'smokes', '封烟', '烟弹', '过点烟', '封烟弹'],
  },
  {
    canon: '闪光弹',
    kind: 'grenade',
    terms: ['闪光弹', '闪光', '闪', 'flash', 'flashbang', '闪白', '飞白', '白', '过点闪'],
  },
  {
    canon: '燃烧弹',
    kind: 'grenade',
    terms: ['燃烧弹', '燃烧瓶', '火', 'molly', 'molotov', 'incendiary', '火瓶', '烧', '燃烧'],
  },
  {
    canon: '手雷',
    kind: 'grenade',
    terms: ['手雷', '手榴弹', '雷', 'he', 'hegrenade', 'he grenade', '炸雷', '炸'],
  },
]

/** 投掷方法同义组（长的写前面，匹配时按最长优先） */
export const METHOD_GROUPS: SynonymGroup[] = [
  {
    canon: '跑跳投',
    kind: 'method',
    terms: ['跑跳投', '跑跳投掷', 'runjumpthrow', 'run jump throw', '跑跳', '助跑跳投'],
  },
  {
    canon: '双键跳投',
    kind: 'method',
    terms: ['双键跳投', '双键', '左右键跳投', '双键投'],
  },
  {
    canon: '站投',
    kind: 'method',
    terms: ['站投', '原地投', '站立投', '站姿', '站扔', 'static', 'standing', '站着投'],
  },
  { canon: '跳投', kind: 'method', terms: ['跳投', '跳着投', '跳起投', 'jumpthrow', 'jump throw', 'jt'] },
  { canon: '跑投', kind: 'method', terms: ['跑投', '跑着投', '助跑投', '移动投', 'runthrow', 'run throw'] },
  { canon: '蹲投', kind: 'method', terms: ['蹲投', '下蹲投', '蹲着投', '蹲下投', 'crouchthrow', '蹲跳投'] },
]

/** 阵营同义组 */
export const SIDE_GROUPS: SynonymGroup[] = [
  {
    canon: 'T',
    kind: 'side',
    terms: ['t', 't方', '匪', '匪方', '匪徒', '恐怖分子', 'terrorist', 'terrorists', 'tside', 't side', '进攻方'],
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
      '防守方',
    ],
  },
]

/** 其他可搜索的标签词（不参与字段比对，只用于加权） */
export const TAG_GROUPS: SynonymGroup[] = [
  {
    canon: 'rush',
    kind: 'tag',
    terms: ['rush', '快攻', '冲点', '打rush', '防rush', '防快攻', 'rush防', '快rush', 'rush点', '强攻'],
  },
  {
    canon: '过点',
    kind: 'tag',
    terms: ['过点', '过点烟', '过点闪', '过点火', '过点雷', '封过点', '过点封'],
  },
  {
    canon: '封烟',
    kind: 'tag',
    terms: ['封烟', '封锁', '封住', '挡烟', '封枪', '封视野', '封狙'],
  },
  {
    canon: '防守',
    kind: 'tag',
    terms: ['防守', '守点', '守包点', '守a', '守b', '回防', '防rush'],
  },
  {
    canon: '进攻',
    kind: 'tag',
    terms: ['进攻', '下包', '进点', '打点', '抢点', '拿点', '清a', '清b'],
  },
  {
    canon: '清点',
    kind: 'tag',
    terms: ['清点', '清点烟', '清点闪', '清点火', '清点雷', '烧点', '烧包点'],
  },
  {
    canon: '灭火',
    kind: 'tag',
    terms: ['灭火', '灭烟', '灭火烟', '灭火瓶', '扑火', '灭包点火'],
  },
  {
    canon: '反清',
    kind: 'tag',
    terms: ['反清', '反清闪', '反清烟', 'peek闪', '反打'],
  },
  {
    canon: '保护烟',
    kind: 'tag',
    terms: ['保护烟', '辅助烟', '假打烟', '保护队友'],
  },
]

export const ALL_GROUPS: SynonymGroup[] = [
  ...MAP_GROUPS,
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
  // 领域相关但无区分度的词（注意：地图名已经变成可搜索的地图词，不要放进来）
  'cs2',
  'csgo',
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

/**
 * 每个位置的区域归属（用于「A区 / 中路 / B区」筛选）。
 * 键有两种写法：
 *   '警家'          → 三张图通用
 *   'mirage:拱门'   → 只在某张图生效（同一个词在不同图可能属于不同区域）
 * 以后加新位置在这里登记即可。
 */
export const ZONE_MAP: Record<string, 'A' | 'MID' | 'B'> = {
  /* 通用 */
  警家: 'A',
  匪家: 'MID',
  A平台: 'A',
  B平台: 'B',
  中路: 'MID',

  /* 炽热沙城 */
  'dust2:A大': 'A',
  'dust2:A小': 'A',
  'dust2:坑': 'A',
  'dust2:B洞': 'B',
  'dust2:B门': 'B',
  'dust2:B1': 'B',
  'dust2:B2': 'B',
  'dust2:Xbox': 'MID',
  'dust2:车': 'B',
  'dust2:油桶': 'A',
  'dust2:后花园': 'B',
  'dust2:狙位': 'B',
  'dust2:狗位': 'B',
  'dust2:假门': 'B',

  /* 炼狱小镇 */
  'inferno:香蕉道': 'B',
  'inferno:车': 'B',
  'inferno:沙袋': 'B',
  'inferno:树位': 'B',
  'inferno:一箱': 'B',
  'inferno:二箱': 'B',
  'inferno:三箱': 'B',
  'inferno:棺材': 'B',
  'inferno:喷泉': 'B',
  'inferno:死点': 'B',
  'inferno:花园': 'B',
  'inferno:锅炉房': 'MID',
  'inferno:侧道': 'MID',
  'inferno:下水道': 'MID',
  'inferno:拱门': 'A',
  'inferno:大坑': 'A',
  'inferno:小坑': 'A',
  'inferno:墓地': 'A',
  'inferno:教堂': 'A',
  'inferno:书房': 'A',
  'inferno:A二楼': 'A',
  'inferno:阳台': 'A',
  'inferno:草车': 'A',
  'inferno:长廊': 'A',
  'inferno:凹槽': 'A',
  'inferno:马棚': 'A',

  /* 荒漠迷城 */
  'mirage:A1': 'A',
  'mirage:A二楼': 'A',
  'mirage:跳台': 'A',
  'mirage:忍者位': 'A',
  'mirage:死点': 'A',
  'mirage:三明治': 'A',
  'mirage:长箱': 'A',
  'mirage:售票亭': 'A',
  'mirage:垃圾桶': 'A',
  'mirage:拱门': 'MID',
  'mirage:VIP': 'MID',
  'mirage:小黑屋': 'MID',
  'mirage:下水道': 'MID',
  'mirage:草车': 'MID',
  'mirage:超市': 'B',
  'mirage:厨房': 'B',
  'mirage:B二楼': 'B',
  'mirage:沙发': 'B',
  'mirage:白车': 'B',
  'mirage:B小': 'B',
  'mirage:长椅': 'B',
}

/** 查区域：先找「地图:位置」，再退回通用位置 */
export function zoneOf(map: string, canon: string): 'A' | 'MID' | 'B' | undefined {
  return ZONE_MAP[`${map}:${canon}`] ?? ZONE_MAP[canon]
}
