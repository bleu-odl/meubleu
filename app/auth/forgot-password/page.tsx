'use client'

import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleReset() {
    setLoading(true)
    // Redireciona para uma página de atualização (que faremos depois)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      alert('Verifique seu e-mail! Enviamos um link de recuperação.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Recuperar Senha</h2>
          <p className="mt-2 text-sm text-gray-600">Digite seu e-mail para receber o link.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="seu@email.com"
            />
          </div>

          <button
            onClick={handleReset}
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Link'}
          </button>

          <div className="text-center">
             <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
               Voltar para Login
             </Link>
          </div>
        </div>
      </div>
    </div>
  )
}