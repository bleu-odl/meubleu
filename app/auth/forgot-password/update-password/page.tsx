'use client'

import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Ao carregar, verifica se tem sessão (o link do email loga o usuário automaticamente)
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Usuário está no modo de recuperação
      }
    })
  }, [])

  async function handleUpdate() {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: password })

    if (error) {
      alert('Erro ao atualizar senha: ' + error.message)
    } else {
      alert('Senha atualizada com sucesso! Você será redirecionado.')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Criar Nova Senha</h2>
          <p className="mt-2 text-sm text-gray-600">Digite sua nova senha abaixo.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="••••••"
            />
          </div>

          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Confirmar Nova Senha'}
          </button>
        </div>
      </div>
    </div>
  )
}