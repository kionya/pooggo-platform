type Platform = 'YOUTUBE' | 'NAVER_BLOG' | 'INSTAGRAM'

interface PlatformBadgeProps {
  platform: Platform
}

const config: Record<Platform, { label: string; className: string }> = {
  YOUTUBE:    { label: '유튜브',    className: 'bg-red-100 text-red-700' },
  NAVER_BLOG: { label: '네이버블로그', className: 'bg-green-100 text-green-700' },
  INSTAGRAM:  { label: '인스타그램', className: 'bg-pink-100 text-pink-700' },
}

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  const { label, className } = config[platform] ?? { label: platform, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}
