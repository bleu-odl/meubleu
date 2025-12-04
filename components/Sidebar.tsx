'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, List, User, Wallet, Tags, TrendingUp } from 'lucide-react'
import { createClient } from '../lib/supabase'
import { useEffect, useState } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [userInitial, setUserInitial] = useState('U')
  const [userName, setUserName] = useState('Usuário')

  // Cor Principal (Azul Neon)
  const primaryColor = '#5B6CFF' 

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
        setUserName(name)
        setUserInitial(name.charAt(0).toUpperCase())
      }
    }
    getUserData()
  }, [])

  if (pathname === '/login' || pathname === '/') {
    return null
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navSections = [
    {
      title: 'Principal',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Movimento',
      items: [
        { name: 'Receitas', path: '/incomes', icon: TrendingUp },
        { name: 'Lançamentos', path: '/expenses', icon: List },
        { name: 'Minhas Despesas', path: '/accounts', icon: Tags }
      ]
    },
    {
      title: 'Conta',
      items: [
        { name: 'Perfil', path: '/profile', icon: User }
      ]
    }
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#181924] border-r border-white/5 flex flex-col z-50 text-slate-300">
      
      {/* LOGO */}
      <div className="h-20 flex items-center px-6">
        <div className="flex items-center gap-2.5 text-white font-semibold">
          <div 
            className="flex items-center justify-center w-8 h-8 text-white rounded-lg shadow-sm shadow-blue-900/20"
            style={{ backgroundColor: primaryColor }}
          >
            <Wallet size={16} strokeWidth={2.5} />
          </div>
          <span className="text-[15px] tracking-tight">Finance SaaS</span>
        </div>
      </div>

      {/* NAVEGAÇÃO */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {section.title}
            </h3>
            
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.path
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`
                        group flex items-center gap-3 px-3 py-2 rounded-full text-[14px] font-medium transition-all duration-200
                        ${isActive ? 'text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                      `}
                      style={isActive ? { backgroundColor: primaryColor } : {}}
                    >
                      <item.icon 
                        size={18} 
                        strokeWidth={2}
                        className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} 
                      />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* RODAPÉ */}
      <div className="p-4">
        <div className="flex items-center gap-3 p-3 bg-[#23242f] border border-white/5 rounded-xl shadow-sm">
          <div 
            className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white truncate">
              {userName}
            </p>
            <button 
              onClick={handleLogout}
              className="text-[11px] text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </div>

    </aside>
  )
}