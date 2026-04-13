import type { ReactNode } from 'react'

type Color = 'blue' | 'green' | 'orange' | 'purple' | 'red'

interface KpiCardProps {
  label: string
  value: string
  subLabel?: string
  color: Color
  icon: ReactNode
  trend?: number
}

const colorMap: Record<Color, string> = {
  blue:   'text-blue-600 bg-blue-50',
  green:  'text-emerald-600 bg-emerald-50',
  orange: 'text-orange-500 bg-orange-50',
  purple: 'text-violet-600 bg-violet-50',
  red:    'text-rose-600 bg-rose-50',
}

export default function KpiCard({ label, value, subLabel, color, icon, trend }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</span>
        {trend !== undefined && (
          <span className={`text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${colorMap[color].split(' ')[0]}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
    </div>
  )
}
