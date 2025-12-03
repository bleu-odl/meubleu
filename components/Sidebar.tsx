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

  // Busca dados do usuário para o rodapé
  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Tenta pegar do metadata ou do email
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
        setUserName(name)
        setUserInitial(name.charAt(0).toUpperCase())
      }
    }
    getUserData()
  }, [])

  // LISTA NEGRA
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // DEFINIÇÃO DAS SEÇÕES DO MENU
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
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#F9FAFB] border-r border-slate-200/60 flex flex-col z-50">
      
      {/* 1. LOGO / TOPO */}
      <div className="h-20 flex items-center px-6">
        <div className="flex items-center gap-2.5 text-[#0F172A] font-semibold">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg shadow-sm shadow-blue-200">
            <Wallet size={16} strokeWidth={2.5} />
          </div>
          <span className="text-[15px] tracking-tight">Finance SaaS</span>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO POR SEÇÕES */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx}>
            {/* Label da Seção */}
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {section.title}
            </h3>
            
            {/* Lista de Itens */}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.path
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`
                        group flex items-center gap-3 px-3 py-2 rounded-full text-[14px] font-medium transition-all duration-200
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700' // Estado Ativo Suave
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' // Estado Normal
                        }
                      `}
                    >
                      <item.icon 
                        size={18} 
                        strokeWidth={2}
                        className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} 
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

      {/* 3. RODAPÉ (USUÁRIO) */}
      <div className="p-4">
        <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {userInitial}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-900 truncate">
              {userName}
            </p>
            <button 
              onClick={handleLogout}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </div>

    </aside>
  )
}