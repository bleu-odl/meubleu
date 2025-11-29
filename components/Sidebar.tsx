'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, List, User, LogOut, Wallet, Tags } from 'lucide-react'
import { createClient } from '../lib/supabase'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // LISTA NEGRA: Páginas onde a Sidebar NÃO deve aparecer
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Lançamentos', path: '/expenses', icon: List },
    { name: 'Minhas Despesas', path: '/accounts', icon: Tags }, // Item novo
    { name: 'Perfil', path: '/profile', icon: User },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white shadow-sm flex flex-col hidden md:flex">
      
      {/* LOGO */}
      <div className="flex h-16 items-center border-b border-gray-100 px-6">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Wallet />
            <span>Finance SaaS</span>
        </div>
      </div>

      {/* LINKS DE NAVEGAÇÃO */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* RODAPÉ (LOGOUT) */}
      <div className="border-t border-gray-100 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  )
}