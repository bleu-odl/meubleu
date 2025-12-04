'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, LogOut, Shield, Mail, Lock, Trash2, Save, 
  Phone, Calendar, DollarSign, Eye, EyeOff, Camera, CheckCircle2, AlertTriangle, Edit2 
} from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  
  // Formulário
  const [formData, setFormData] = useState({ username: '', email: '', full_name: '', phone: '' })
  const [financialPrefs, setFinancialPrefs] = useState({ currency: 'BRL', start_day: 1 })
  
  // Segurança
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [loadingPass, setLoadingPass] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchProfile() }, [])

  // Força da senha
  useEffect(() => {
    const pass = passwords.new
    let score = 0
    if (!pass) { setPasswordStrength(0); return }
    if (pass.length >= 6) score += 1
    if (pass.length >= 10) score += 1
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1
    setPasswordStrength(score)
  }, [passwords.new])

  async function fetchProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

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
      setIsEditing(false)
      alert("Perfil atualizado com sucesso!")
    }
    setLoadingSave(false)
  }

  async function handleChangePassword() {
    if (!passwords.new) return alert("Digite a nova senha.")
    if (passwords.new !== passwords.confirm) return alert("As senhas não conferem.")
    
    setLoadingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })

    if (error) { alert("Erro: " + error.message) } 
    else {
      alert("Senha atualizada com segurança!")
      setPasswords({ new: '', confirm: '' })
    }
    setLoadingPass(false)
  }

  async function handleDeleteAccount() {
    const confirmText = prompt("Para confirmar, digite 'ENCERRAR':")
    if (confirmText !== 'ENCERRAR') return

    const { error } = await supabase.from('users').delete().eq('id', profile.id)
    if (error) { alert("Erro: " + error.message) } 
    else {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = () => {
    const name = formData.full_name || formData.username || 'U'
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando...</div>

  return (
    <div className="min-h-screen p-8 pb-32 bg-[#1E1F2B]">
      <div className="mx-auto max-w-3xl space-y-6"> {/* Largura controlada e pilha vertical */}
        
        {/* 1. CABEÇALHO */}
        <div className="bg-[#23242f] rounded-2xl p-8 border border-white/5 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left shadow-lg shadow-black/20">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-[#1E1F2B]">
              {getInitials()}
            </div>
            <div className="absolute bottom-0 right-0 bg-[#23242f] p-1.5 rounded-full border border-white/10 text-slate-400">
               <Camera size={16} />
            </div>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{formData.full_name || 'Usuário'}</h1>
            <p className="text-slate-400">Minha Conta</p>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={12} className="mr-1.5"/> Ativa
            </div>
          </div>

          <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-colors flex items-center gap-2">
            <LogOut size={16}/> Sair
          </button>
        </div>

        {/* 2. DADOS PESSOAIS */}
        <div className="bg-[#23242f] rounded-2xl p-8 border border-white/5 shadow-lg shadow-black/20 relative">
            {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                    <Edit2 size={20} />
                </button>
            )}

            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <User size={20} className="text-indigo-500"/> Informações Pessoais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Completo</label>
                    {isEditing ? (
                        <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    ) : (
                        <p className="text-slate-300 font-medium text-sm py-2 border-b border-white/5">{formData.full_name || '-'}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Usuário</label>
                    {isEditing ? (
                        <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    ) : (
                        <p className="text-slate-300 font-medium text-sm py-2 border-b border-white/5">@{formData.username}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone</label>
                    {isEditing ? (
                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="(00) 00000-0000"/>
                    ) : (
                        <p className="text-slate-300 font-medium text-sm py-2 border-b border-white/5">{formData.phone || '-'}</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail</label>
                    {isEditing ? (
                         <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    ) : (
                        <p className="text-slate-300 font-medium text-sm py-2 border-b border-white/5">{formData.email}</p>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">Cancelar</button>
                    <button onClick={handleSaveAll} disabled={loadingSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all disabled:opacity-50">
                        {loadingSave ? 'Salvando...' : <><Save size={18} /> Salvar</>}
                    </button>
                </div>
            )}
        </div>

        {/* 3. PREFERÊNCIAS FINANCEIRAS */}
        <div className="bg-[#23242f] rounded-2xl p-8 border border-white/5 shadow-lg shadow-black/20">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <DollarSign size={20} className="text-indigo-500"/> Preferências Financeiras
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moeda Principal</label>
                    <select value={financialPrefs.currency} onChange={e => setFinancialPrefs({...financialPrefs, currency: e.target.value})} className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none [&>option]:bg-[#181924]">
                        <option value="BRL">BRL - Real Brasileiro</option>
                        <option value="USD">USD - Dólar Americano</option>
                        <option value="EUR">EUR - Euro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Início do Mês</label>
                    <select value={financialPrefs.start_day} onChange={e => setFinancialPrefs({...financialPrefs, start_day: parseInt(e.target.value)})} className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none [&>option]:bg-[#181924]">
                        {[...Array(31)].map((_, i) => (
                            <option key={i+1} value={i+1}>Dia {i+1}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                 <button onClick={handleSaveAll} className="text-sm text-indigo-400 font-medium hover:text-indigo-300 hover:underline">Salvar preferências</button>
            </div>
        </div>

        {/* 4. SEGURANÇA */}
        <div className="bg-[#23242f] rounded-2xl p-8 border border-white/5 shadow-lg shadow-black/20">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Shield size={20} className="text-indigo-500"/> Segurança
            </h2>
            
            <div className="space-y-5 max-w-md">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nova Senha</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={passwords.new}
                            onChange={e => setPasswords({...passwords, new: e.target.value})}
                            className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 pl-10 pr-10 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                            placeholder="••••••"
                        />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                    {/* Barra de Força */}
                    {passwords.new && (
                        <div className="mt-2 h-1 w-full bg-[#181924] rounded-full overflow-hidden flex gap-1">
                            <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength >= 1 ? 'bg-red-500' : 'bg-transparent'}`}></div>
                            <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength >= 2 ? 'bg-yellow-500' : 'bg-transparent'}`}></div>
                            <div className={`h-full flex-1 rounded-full transition-colors ${passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar Senha</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input 
                            type="password" 
                            value={passwords.confirm}
                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                            className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 pl-10 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                            placeholder="••••••"
                        />
                    </div>
                </div>
                
                <div className="pt-2 flex flex-col gap-3">
                    <button 
                        onClick={handleChangePassword}
                        disabled={loadingPass || !passwords.new}
                        className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                    >
                        {loadingPass ? 'Salvando...' : 'Atualizar Senha'}
                    </button>
                </div>
            </div>
        </div>

        {/* 5. ZONA DE PERIGO */}
        <div className="bg-[#23242f] rounded-2xl p-8 border border-red-500/20 shadow-lg shadow-black/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                    <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white mb-1">Encerrar conta</h2>
                    <p className="text-sm text-slate-400 mb-4">
                        Ação irreversível. Seus dados serão apagados permanentemente.
                    </p>
                    <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
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