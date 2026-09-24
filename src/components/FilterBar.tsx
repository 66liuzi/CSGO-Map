import type { GrenadeType, Side, Zone } from '../data/types'
import { ZONE_LABEL } from '../data/types'
import { MAPS, type MapId } from '../data/maps'
import type { Filters } from '../lib/search'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  hideSamples: boolean
  onToggleSamples: (v: boolean) => void
  sampleCount: number
  /** 每张图各有多少条，chip 上显示 */
  countsByMap: Record<string, number>
}

const MAP_CHIPS: { value: MapId | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部' },
  ...MAPS.map((m) => ({ value: m.id as MapId | 'ALL', label: m.short })),
]

const SIDES: { value: Side | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'T', label: 'T' },
  { value: 'CT', label: 'CT' },
]

const GRENADES: { value: GrenadeType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: '烟雾弹', label: '烟雾弹' },
  { value: '闪光弹', label: '闪光弹' },
  { value: '燃烧弹', label: '燃烧弹' },
  { value: '手雷', label: '手雷' },
]

const ZONES: { value: Zone | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'A', label: ZONE_LABEL.A },
  { value: 'MID', label: ZONE_LABEL.MID },
  { value: 'B', label: ZONE_LABEL.B },
]

export default function FilterBar({
  filters,
  onChange,
  hideSamples,
  onToggleSamples,
  sampleCount,
  countsByMap,
}: Props) {
  const dirty =
    filters.map !== 'ALL' || filters.side !== 'ALL' || filters.grenade !== 'ALL' || filters.zone !== 'ALL'

  return (
    <div className="filters">
      <div className="filterrow maps" role="group" aria-label="地图筛选">
        <span className="filterlabel">地图</span>
        {MAP_CHIPS.map((m) => (
          <button
            key={m.value}
            className={`chip${filters.map === m.value ? ' on' : ''}`}
            onClick={() => onChange({ ...filters, map: m.value })}
          >
            {m.label}
            {m.value !== 'ALL' && countsByMap[m.value] ? (
              <span className="chipcount">{countsByMap[m.value]}</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="filterrow" role="group" aria-label="阵营筛选">
        <span className="filterlabel">阵营</span>
        {SIDES.map((s) => (
          <button
            key={s.value}
            className={`chip${filters.side === s.value ? ' on' : ''}`}
            onClick={() => onChange({ ...filters, side: s.value })}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="filterrow" role="group" aria-label="道具筛选">
        <span className="filterlabel">道具</span>
        {GRENADES.map((g) => (
          <button
            key={g.value}
            className={`chip${filters.grenade === g.value ? ' on' : ''}`}
            onClick={() => onChange({ ...filters, grenade: g.value })}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="filterrow" role="group" aria-label="区域筛选">
        <span className="filterlabel">区域</span>
        {ZONES.map((z) => (
          <button
            key={z.value}
            className={`chip${filters.zone === z.value ? ' on' : ''}`}
            onClick={() => onChange({ ...filters, zone: z.value })}
          >
            {z.label}
          </button>
        ))}
        {dirty && (
          <button
            className="chip reset"
            onClick={() => onChange({ map: 'ALL', side: 'ALL', grenade: 'ALL', zone: 'ALL' })}
          >
            清除筛选
          </button>
        )}
      </div>
      {sampleCount > 0 && (
        <div className="filterrow">
          <label className="switch">
            <input type="checkbox" checked={hideSamples} onChange={(e) => onToggleSamples(e.target.checked)} />
            <span>隐藏 {sampleCount} 条示例数据</span>
          </label>
        </div>
      )}
    </div>
  )
}
