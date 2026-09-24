interface Props {
  suggestions: string[]
  onPick: (q: string) => void
  onClearFilters: () => void
  hasFilters: boolean
  query: string
  /** 选中的这张图还没有录入任何点位 */
  mapEmpty?: boolean
}

export default function EmptyState({ suggestions, onPick, onClearFilters, hasFilters, query, mapEmpty }: Props) {
  return (
    <div className="empty">
      <div className="emptyicon">🎯</div>
      <h3>{mapEmpty ? '这张图还没有点位' : '没有找到相关点位'}</h3>
      <p className="muted">
        {mapEmpty
          ? '这张地图还没录入内容。把准心图发给 AI 说一句说明，就会自动加进来。'
          : query
            ? `没搜到「${query}」`
            : '当前筛选条件下没有点位'}
        {!mapEmpty && (hasFilters ? '，可能被筛选条件挡住了。' : '，换个说法试试。')}
      </p>
      {suggestions.length > 0 && (
        <>
          <p className="muted small">可以试试这些关键词：</p>
          <div className="suggestrow">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => onPick(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}
      {hasFilters && (
        <button className="btn primary" onClick={onClearFilters}>
          清除筛选
        </button>
      )}
    </div>
  )
}
