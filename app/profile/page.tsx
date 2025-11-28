'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Shield, Mail, CreditCard } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    // 1. Pega o usuário logado (Auth)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // 2. Pega os detalhes na tabela pública (Plano, Username)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
    } else {
      // Se não achar perfil público, usa dados básicos do Auth
      setProfile({ 
        email: user.email, 
        username: user.email?.split('@')[0], 
        plano: 'free' 
      })
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut() // Desloga do Supabase
    router.push('/login') // Manda de volta pra tela de entrada
    router.refresh() // Limpa o cache
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando perfil...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Voltar para Dashboard
          </button>
        </div>

        {/* Card Principal de Info */}
        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
            
            {/* Avatar (Círculo com Inicial) */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile?.username || 'Usuário'}
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 mt-1">
                  <Mail size={16} />
                  <span>{profile?.email}</span>
                </div>
              </div>

              {/* Badge do Plano */}
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 border border-green-100">
                <Shield size={14} />
                <span>Plano: {profile?.plano === 'premium' ? 'Premium' : 'Free'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card do Plano (Detalhes) */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-gray-400"/>
                Assinatura
            </h3>
            
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 border border-gray-200">
                <div>
                    <p className="font-medium text-gray-900">
                        {profile?.plano === 'premium' ? 'Membro Premium' : 'Membro Gratuito'}
                    </p>
                    <p className="text-sm text-gray-500">
                        {profile?.plano === 'premium' 
                            ? 'Você tem acesso a todos os recursos!' 
                            : 'Você está no plano básico.'}
                    </p>
                </div>
                {profile?.plano !== 'premium' && (
                    <button className="rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm">
                        Fazer Upgrade
                    </button>
                )}
            </div>
        </div>

        {/* Botão de Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium shadow-sm"
        >
          <LogOut size={20} />
          Sair da minha conta
        </button>

      </div>
    </div>
  )
}