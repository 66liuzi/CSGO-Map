interface Props {
  suggestions: string[]
  onPick: (q: string) => void
  onClearFilters: () => void
  hasFilters: boolean
  query: string
}

export default function EmptyState({ suggestions, onPick, onClearFilters, hasFilters, query }: Props) {
  return (
    <div className="empty">
      <div className="emptyicon">🎯</div>
      <h3>没有找到相关点位</h3>
      <p className="muted">
        {query ? `没搜到「${query}」` : '当前筛选条件下没有点位'}
        {hasFilters ? '，可能被筛选条件挡住了。' : '，换个说法试试。'}
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
