'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, TrendingUp, BarChart2, Activity, Menu, X } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/admin/databridge/competitor', label: '경쟁사 분석', icon: Search },
  { href: '/admin/databridge/funnel', label: '마케팅 퍼널', icon: TrendingUp },
  { href: '/admin/databridge/procedures', label: '시술별 성과', icon: BarChart2 },
]

export default function DatabridgeSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#0f1b2d] text-white shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed top-0 left-0 h-full w-56 bg-[#0f1b2d] flex flex-col z-40 transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* 로고 */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={18} className="text-blue-400" />
            <span className="text-white font-bold text-sm">Richdoc</span>
          </div>
          <p className="text-[#94a3b8] text-xs">Hospital Data Analytics</p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1e3a5f] text-white'
                    : 'text-[#94a3b8] hover:bg-[#1a2f4a] hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* 하단 */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[#94a3b8] text-xs">Richdoc Analytics</p>
          <p className="text-white text-xs font-medium">원장님 대시보드</p>
        </div>
      </aside>
    </>
  )
}
