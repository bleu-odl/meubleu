'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, LogOut, Shield, Mail, Lock, Trash2, Save, 
  Phone, Calendar, DollarSign, Eye, EyeOff, Camera, CheckCircle2, AlertTriangle 
} from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Formulário de Dados Pessoais
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    full_name: '', 
    phone: '' 
  })
  
  // Preferências Financeiras
  const [financialPrefs, setFinancialPrefs] = useState({
    currency: 'BRL',
    start_day: 1
  })

  // Segurança
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0) // 0 a 4
  const [loadingPass, setLoadingPass] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  // Cálculo de Força da Senha
  useEffect(() => {
    const pass = passwords.new
    let score = 0
    if (!pass) { setPasswordStrength(0); return }
    if (pass.length >= 6) score += 1
    if (pass.length >= 10) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    setPasswordStrength(score)
  }, [passwords.new])

  async function fetchProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()

    if (data) {
      setProfile(data)
      setFormData({ 
        username: data.username || '', 
        email: data.email || '',
        full_name: data.full_name || '',
        phone: data.phone || ''
      })
      setFinancialPrefs({
        currency: data.currency || 'BRL',
        start_day: data.financial_start_day || 1
      })
    }
    setLoading(false)
  }

  // --- SALVAR DADOS (Geral) ---
  async function handleSaveAll() {
    if(!profile) return
    setLoadingSave(true)

    const updates = {
      full_name: formData.full_name,
      username: formData.username,
      phone: formData.phone,
      currency: financialPrefs.currency,
      financial_start_day: financialPrefs.start_day,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('users').update(updates).eq('id', profile.id)

    if (error) {
      alert("Erro ao atualizar: " + error.message)
    } else {
      setProfile({ ...profile, ...updates })
      alert("Alterações salvas com sucesso!")
    }
    setLoadingSave(false)
  }

  // --- ALTERAR SENHA ---
  async function handleChangePassword() {
    if (!passwords.new) return alert("Digite a nova senha.")
    if (passwords.new !== passwords.confirm) return alert("As senhas não conferem.")
    
    setLoadingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })

    if (error) {
      alert("Erro: " + error.message)
    } else {
      alert("Senha atualizada com segurança!")
      setPasswords({ new: '', confirm: '' })
    }
    setLoadingPass(false)
  }

  // --- ENCERRAR CONTA ---
  async function handleDeleteAccount() {
    const confirmText = prompt("Para confirmar o encerramento, digite 'ENCERRAR':")
    if (confirmText !== 'ENCERRAR') return

    const { error } = await supabase.from('users').delete().eq('id', profile.id)

    if (error) {
      alert("Erro ao encerrar conta: " + error.message)
    } else {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Helper: Iniciais
  const getInitials = () => {
    const name = formData.full_name || formData.username || 'U'
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-3xl space-y-6"> {/* Largura controlada e empilhamento vertical */}
        
        {/* 1. CABEÇALHO DE IDENTIDADE */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-200">
              {getInitials()}
            </div>
            <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow border border-gray-100 text-gray-500">
               <Camera size={16} />
            </div>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{formData.full_name || 'Usuário'}</h1>
            <p className="text-gray-500">Minha Conta</p>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
              <CheckCircle2 size={12} className="mr-1.5"/> Ativa
            </div>
          </div>

          <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
            <LogOut size={16}/> Sair
          </button>
        </div>

        {/* 2. DADOS PESSOAIS */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <User size={20} className="text-blue-600"/> Informações Pessoais
                </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nome Completo</label>
                    <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full rounded-lg border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none border" placeholder="Seu nome"/>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nome de Usuário</label>
                    <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full rounded-lg border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none border"/>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Telefone</label>
                    <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-lg border-gray-200 bg-white p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-100 outline-none border" placeholder="(00) 00000-0000"/>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">E-mail</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input type="email" value={formData.email} disabled className="w-full rounded-lg border-gray-200 bg-gray-50 p-2.5 pl-10 text-sm text-gray-500 cursor-not-allowed border"/>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={handleSaveAll} disabled={loadingSave} className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50">
                    {loadingSave ? 'Salvando...' : <><Save size={18} /> Salvar alterações</>}
                </button>
            </div>
        </div>

        {/* 3. PREFERÊNCIAS FINANCEIRAS */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign size={20} className="text-blue-600"/> Preferências Financeiras
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Moeda Principal</label>
                    <select value={financialPrefs.currency} onChange={e => setFinancialPrefs({...financialPrefs, currency: e.target.value})} className="w-full rounded-lg border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none border">
                        <option value="BRL">BRL - Real Brasileiro</option>
                        <option value="USD">USD - Dólar Americano</option>
                        <option value="EUR">EUR - Euro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Início do Mês Financeiro</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <select value={financialPrefs.start_day} onChange={e => setFinancialPrefs({...financialPrefs, start_day: parseInt(e.target.value)})} className="w-full rounded-lg border-gray-200 bg-white p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-100 outline-none border">
                            {[...Array(31)].map((_, i) => (
                                <option key={i+1} value={i+1}>Dia {i+1}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                 <button onClick={handleSaveAll} className="text-sm text-blue-600 font-medium hover:underline">Salvar preferências</button>
            </div>
        </div>

        {/* 4. SEGURANÇA (SENHA) */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield size={20} className="text-blue-600"/> Segurança
            </h2>
            
            <div className="space-y-5 max-w-md">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nova Senha</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={passwords.new}
                            onChange={e => setPasswords({...passwords, new: e.target.value})}
                            className="w-full rounded-lg border-gray-200 bg-white p-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-blue-100 outline-none border"
                            placeholder="••••••"
                        />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                    {/* BARRA DE FORÇA */}
                    <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength >= 1 ? 'bg-red-400' : 'bg-transparent'}`}></div>
                        <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength >= 2 ? 'bg-yellow-400' : 'bg-transparent'}`}></div>
                        <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength >= 3 ? 'bg-green-400' : 'bg-transparent'}`}></div>
                        <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength >= 4 ? 'bg-emerald-600' : 'bg-transparent'}`}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 text-right font-medium">
                        {passwordStrength >= 4 ? 'Senha forte ✅' : 'Mínimo 6 caracteres'}
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Confirmar Senha</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            type="password" 
                            value={passwords.confirm}
                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                            className="w-full rounded-lg border-gray-200 bg-white p-2.5 pl-10 text-sm focus:ring-2 focus:ring-blue-100 outline-none border"
                            placeholder="••••••"
                        />
                    </div>
                </div>
                
                <div className="pt-2 flex items-center justify-between">
                    <Link href="/auth/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
                        Recuperar acesso
                    </Link>
                    <button 
                        onClick={handleChangePassword}
                        disabled={loadingPass || !passwords.new}
                        className="px-6 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {loadingPass ? 'Salvando...' : 'Salvar nova senha'}
                    </button>
                </div>
            </div>
        </div>

        {/* 5. ZONA DE PERIGO */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-full text-red-600">
                    <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Encerrar conta</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Essa ação é permanente. Todos os seus dados, despesas e histórico serão apagados e não poderão ser recuperados.
                    </p>
                    <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                    >
                        Encerrar conta definitivamente
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  )
}