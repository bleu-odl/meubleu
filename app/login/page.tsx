'use client'

import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { useToast } from '../../components/ToastContext'

export default function LoginPage() {
  const { addToast } = useToast()
  
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth() {
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        addToast("Erro ao entrar: " + error.message, 'error')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      if (username.length < 3) {
        addToast("O nome de usuário deve ter pelo menos 3 caracteres.", 'info')
        setLoading(false); return
      }
      const cleanUsername = username.replace(/\s/g, '').toLowerCase()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: cleanUsername, plano: 'free' } }
      })

      if (error) {
        addToast("Erro ao cadastrar: " + error.message, 'error')
      } else {
        addToast("Cadastro realizado! Verifique seu e-mail.", 'success')
        setMode('login')
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4 relative overflow-hidden">
        
        {/* Efeito de fundo */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-8 shadow-2xl relative z-10">
            <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/20">
                    <Wallet size={24} strokeWidth={2.5}/>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                    {mode === 'login' ? 'Bem-vindo de volta' : 'Criar nova conta'}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                    Gerencie suas finanças de forma simples e profissional.
                </p>
            </div>

            <div className="flex rounded-lg bg-zinc-950 p-1 border border-white/5">
                <button onClick={() => setMode('login')} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${mode === 'login' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Entrar</button>
                <button onClick={() => setMode('register')} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${mode === 'register' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Cadastrar</button>
            </div>
            
            <div className="space-y-4">
                {mode === 'register' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Usuário</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder:text-zinc-600 transition-all" placeholder="ex: joaosilva"/>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">E-mail</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder:text-zinc-600 transition-all" placeholder="seu@email.com"/>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Senha</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder:text-zinc-600 transition-all" placeholder="••••••"/>
                </div>

                {mode === 'login' && (
                    <div className="text-right">
                        <Link href="/auth/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Esqueci minha senha</Link>
                    </div>
                )}

                <button onClick={handleAuth} disabled={loading} className="w-full flex justify-center py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Processando...' : (mode === 'login' ? 'Acessar Painel' : 'Criar Conta Grátis')}
                </button>
            </div>
        </div>
    </div>
  )
}