import { assetUrl } from '../lib/assets'
import type { Lineup } from '../data/types'
import { lineupTitle, GRENADE_SHORT } from '../data/types'
import { mapLabel } from '../data/maps'

interface Props {
  lineup: Lineup
  onOpen: (l: Lineup) => void
}

export default function LineupCard({ lineup, onOpen }: Props) {
  return (
    <button className="card" onClick={() => onOpen(lineup)} aria-label={`查看 ${lineupTitle(lineup)}`}>
      <div className="thumbwrap">
        <img
          src={assetUrl(lineup.thumbnail || lineup.image)}
          alt={`${lineupTitle(lineup)} 准心瞄点图`}
          loading="lazy"
          decoding="async"
          className="thumb"
        />
        <div className="badges">
          <span className="badge map">{mapLabel(lineup.map)}</span>
          <span className={`badge side-${lineup.side.toLowerCase()}`}>{lineup.side}</span>
          <span className={`badge g-${GRENADE_SHORT[lineup.grenadeType]}`}>
            {GRENADE_SHORT[lineup.grenadeType] ?? lineup.grenadeType}
          </span>
          <span className="badge method">{lineup.throwMethod}</span>
        </div>
        {lineup.isSample && <span className="flag sample">示例</span>}
        {lineup.needsReview && !lineup.isSample && <span className="flag review">待确认</span>}
      </div>
      <div className="cardbody">
        <div className="cardtitle">{lineupTitle(lineup)}</div>
        <div className="carddesc">{lineup.description}</div>
      </div>
    </button>
  )
}
