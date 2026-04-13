'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Hospital {
  id: string
  name: string
}

interface Props {
  hospitals: Hospital[]
  selectedId: string
}

export default function HospitalSelector({ hospitals, selectedId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('hospitalId', e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={selectedId}
      onChange={handleChange}
      className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer pr-4 appearance-none"
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center' }}
    >
      {hospitals.map(h => (
        <option key={h.id} value={h.id}>{h.name}</option>
      ))}
    </select>
  )
}
