'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Shield, Mail, Lock, Trash2, Save, X, Edit2 } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({ username: '', email: '' })
  const [selectedAvatar, setSelectedAvatar] = useState('')
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loadingPass, setLoadingPass] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const avatars = [
    { id: 'male', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4', label: 'Masculino' },
    { id: 'female', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf', label: 'Feminino' }
  ]

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setFormData({ username: data.username, email: data.email })
      setSelectedAvatar(data.avatar_url || 'male')
    } else {
      // Fallback para evitar tela branca se não tiver perfil público
      const fallbackProfile = { 
        id: user.id,
        email: user.email, 
        username: user.email?.split('@')[0], 
        plano: 'free',
        avatar_url: 'male'
      }
      setProfile(fallbackProfile)
      setFormData({ username: fallbackProfile.username || '', email: fallbackProfile.email || '' })
      setSelectedAvatar('male')
    }
    setLoading(false)
  }

  async function handleUpdateProfile() {
    if(!profile) return
    if(formData.username.length < 3) return alert("Username muito curto!")

    const updates = {
      username: formData.username,
      email: formData.email,
      avatar_url: selectedAvatar,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('users').update(updates).eq('id', profile.id)

    if (error) {
      alert("Erro ao atualizar: " + error.message)
    } else {
      if(formData.email !== profile.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: formData.email })
        if(authError) alert("Atenção: " + authError.message)
        else alert("E-mail atualizado! Verifique sua caixa de entrada.")
      }
      
      setProfile({ ...profile, ...updates })
      setIsEditing(false)
      alert("Perfil atualizado com sucesso!")
    }
  }

  async function handleChangePassword() {
    if (!newPassword) return alert("Digite a nova senha.")
    if (newPassword !== confirmPassword) return alert("As senhas não conferem.")
    
    setLoadingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      alert("Erro: " + error.message)
    } else {
      alert("Senha alterada com sucesso!")
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoadingPass(false)
  }

  async function handleDeleteAccount() {
    const confirmText = prompt("Para deletar sua conta permanentemente, digite 'DELETAR':")
    if (confirmText !== 'DELETAR') return

    const { error } = await supabase.from('users').delete().eq('id', profile?.id)

    if (error) {
      alert("Erro ao apagar dados: " + error.message)
    } else {
      await supabase.auth.signOut()
      alert("Sua conta e dados foram apagados.")
      router.push('/login')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando perfil...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-2xl space-y-8">
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 hover:underline">
            ← Voltar
          </button>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100 relative">
          
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Editar Perfil"
            >
              <Edit2 size={20} />
            </button>
          )}

          <div className="flex flex-col items-center sm:flex-row gap-8">
            
            <div className="flex flex-col items-center gap-3">
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-blue-50 shadow-sm">
                {/* CORREÇÃO AQUI: Adicionado profile?.avatar_url */}
                <img 
                  src={isEditing 
                    ? avatars.find(a => a.id === selectedAvatar)?.url 
                    : avatars.find(a => a.id === (profile?.avatar_url || 'male'))?.url
                  } 
                  alt="Avatar" 
                  className="h-full w-full object-cover"
                />
              </div>
              
              {isEditing && (
                <div className="flex gap-2">
                  {avatars.map(av => (
                    <button
                      key={av.id}
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`text-xs px-2 py-1 rounded border ${selectedAvatar === av.id ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome de Usuário</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full rounded-md border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  // Proteção extra aqui também
                  <p className="text-xl font-bold text-gray-900">{profile?.username}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">E-mail</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full rounded-md border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} />
                    {/* Proteção extra aqui */}
                    <span>{profile?.email}</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-2">
                  <button onClick={handleUpdateProfile} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                    <Save size={16} /> Salvar
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">
                    <X size={16} /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={20} className="text-gray-400"/> Segurança
          </h3>
          
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 text-sm shadow-sm"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 text-sm shadow-sm"
                placeholder="••••••"
              />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <button 
                onClick={handleChangePassword}
                disabled={loadingPass || !newPassword}
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-black disabled:opacity-50"
              >
                {loadingPass ? 'Alterando...' : 'Alterar Senha'}
              </button>
              
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
                Esqueci minha senha atual
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 space-y-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 hover:bg-gray-50 font-medium"
          >
            <LogOut size={20} />
            Sair da Conta
          </button>

          <button
            onClick={handleDeleteAccount}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-600 hover:bg-red-100 font-medium"
          >
            <Trash2 size={20} />
            Deletar Minha Conta
          </button>
          <p className="text-center text-xs text-gray-400">
            Atenção: Ao deletar a conta, todos os seus dados e despesas serão perdidos permanentemente.
          </p>
        </div>

      </div>
    </div>
  )
}