'use client'

import { Bell, Settings } from 'lucide-react'
import { createClient } from '../lib/supabase'
import { useEffect, useState } from 'react'

export function Header() {
  const [userName, setUserName] = useState('Usuário')
  const [userInitial, setUserInitial] = useState('U')
  const [userPlan, setUserPlan] = useState('Free')
  
  const supabase = createClient()

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
        setUserName(name)
        setUserInitial(name.charAt(0).toUpperCase())
        
        const { data: userData } = await supabase.from('users').select('plano').eq('id', user.id).single()
        if (userData) setUserPlan(userData.plano === 'premium' ? 'Premium' : 'Free')
      }
    }
    getUserData()
  }, [])

  return (
    // Altura reduzida para h-16
    <header className="h-16 bg-[#1E1F2B] border-b border-white/5 flex items-center justify-end px-8 sticky top-0 z-40">
      
      <div className="flex items-center gap-6">
        
        {/* Ícones de Ação */}
        <div className="flex items-center gap-4 text-slate-400">
          <button className="hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1E1F2B]"></span>
          </button>
          <button className="hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-white/10"></div>

        {/* Perfil Compacto */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{userName}</p>
            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">{userPlan}</p>
          </div>
          
          {/* Avatar menor (h-8) e redondo (rounded-full) */}
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-900/20 ring-2 ring-[#1E1F2B] cursor-default">
            {userInitial}
          </div>
        </div>

      </div>
    </header>
  )
}