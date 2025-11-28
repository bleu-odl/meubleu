'use client'

import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login') // Controla se é Login ou Cadastro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('') // Novo campo para o cadastro
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth() {
    setLoading(true)

    if (mode === 'login') {
      // --- LÓGICA DE LOGIN ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        alert('Erro ao logar: ' + error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      // --- LÓGICA DE CADASTRO ---
      
      // 1. Validação do Username (Critérios definidos)
      if (username.length < 3) {
        alert("O nome de usuário deve ter pelo menos 3 caracteres.")
        setLoading(false)
        return
      }

      // 2. Limpa o username (remove espaços e deixa minúsculo)
      const cleanUsername = username.replace(/\s/g, '').toLowerCase()

      // 3. Cria a conta
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername, // Salva o nome de usuário no banco
            plano: 'free',
          }
        }
      })

      if (error) {
        alert('Erro ao cadastrar: ' + error.message)
      } else {
        alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.')
        setMode('login') // Volta para a tela de login
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Controle financeiro simples e eficiente.
          </p>
        </div>

        {/* Abas para alternar entre Entrar e Cadastrar */}
        <div className="flex rounded-md bg-gray-100 p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-md py-1 text-sm font-medium transition-all ${
              mode === 'login' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 rounded-md py-1 text-sm font-medium transition-all ${
              mode === 'register' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cadastrar
          </button>
        </div>
        
        <div className="space-y-4">
          
          {/* Campo Nome de Usuário (Aparece APENAS na aba Cadastrar) */}
          {mode === 'register' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700">Nome de Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="ex: joaosilva"
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 3 letras, sem espaços.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="seu@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="******"
            />
          </div>

          {/* Link Esqueci a Senha (Aparece APENAS na aba Entrar) */}
          {mode === 'login' && (
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processando...' : (mode === 'login' ? 'Entrar' : 'Cadastrar')}
          </button>
        </div>
      </div>
    </div>
  )
}