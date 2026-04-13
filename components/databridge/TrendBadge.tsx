interface TrendBadgeProps {
  pct: number
}

export default function TrendBadge({ pct }: TrendBadgeProps) {
  const isUp = pct > 0
  const isFlat = pct === 0

  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
        — 0%
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isUp
          ? 'text-emerald-700 bg-emerald-50'
          : 'text-red-600 bg-red-50'
      }`}
    >
      {isUp ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}
