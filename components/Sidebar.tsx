'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, List, User, LogOut, Wallet, Tags, ChevronRight } from 'lucide-react'
import { createClient } from '../lib/supabase'
import { useState } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isHovered, setIsHovered] = useState(false)

  // LISTA NEGRA: Páginas onde a Sidebar NÃO deve aparecer
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Lançamentos', path: '/expenses', icon: List },
    { name: 'Minhas Despesas', path: '/accounts', icon: Tags },
    { name: 'Perfil', path: '/profile', icon: User },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside 
      className={`peer fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-sm flex flex-col transition-all duration-300 ease-in-out z-50 ${isHovered ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* LOGO */}
      <div className={`flex h-20 items-center px-6 transition-all duration-300 ${isHovered ? 'justify-start' : 'justify-center'}`}>
        <div className="flex items-center gap-3 font-bold text-xl text-blue-600 overflow-hidden whitespace-nowrap">
            <div className="shrink-0 p-2 bg-blue-50 rounded-xl">
              <Wallet size={24} />
            </div>
            
            {/* Texto do Logo com Animação */}
            <span className={`transition-all duration-300 origin-left ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 w-0'}`}>
              Finance SaaS
            </span>
        </div>
      </div>

      {/* LINKS DE NAVEGAÇÃO */}
      <nav className="flex-1 space-y-2 p-4 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 overflow-hidden whitespace-nowrap relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
              } ${isHovered ? 'justify-start' : 'justify-center'}`}
            >
              <item.icon size={22} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
              
              <span className={`transition-all duration-300 origin-left ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 w-0 absolute'}`}>
                {item.name}
              </span>

              {/* Tooltip para quando estiver fechado (opcional, melhora UX) */}
              {!isHovered && (
                <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* RODAPÉ (LOGOUT) */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200 overflow-hidden whitespace-nowrap w-full ${isHovered ? 'justify-start' : 'justify-center'}`}
        >
          <LogOut size={22} className="shrink-0" />
          <span className={`transition-all duration-300 origin-left ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 w-0'}`}>
            Sair
          </span>
        </button>
      </div>
    </aside>
  )
}