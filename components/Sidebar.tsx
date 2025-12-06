'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Removi 'User' e 'LogOut' dos imports pois não serão usados aqui
import { LayoutDashboard, List, Wallet, Tags, TrendingUp } from 'lucide-react'
// Removi createClient e useRouter pois o logout sairá daqui

export function Sidebar() {
  const pathname = usePathname()
  
  if (pathname === '/login' || pathname === '/') {
    return null
  }

  const primaryColor = '#5B6CFF' 

  // Removida a função handleLogout daqui

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
    }
    // Removida a seção 'Conta' (Perfil)
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#181924] border-r border-white/5 flex flex-col z-50 text-slate-300">
      
      <div className="h-16 flex items-center px-6 border-b border-white/5 bg-[#1E1F2B]">
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

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.path
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`
                        group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                        ${isActive ? 'text-white shadow-lg shadow-blue-900/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
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

      {/* Rodapé removido ou deixado vazio apenas com copyright se desejar */}
      <div className="p-4 border-t border-white/5 bg-[#1E1F2B]/50 text-center">
        <span className="text-[10px] text-slate-600">v1.0.0</span>
      </div>

    </aside>
  )
}