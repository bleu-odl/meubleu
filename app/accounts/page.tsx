'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { Trash2, Plus, CreditCard } from 'lucide-react'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [isCreditCard, setIsCreditCard] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { fetchAccounts() }, [])

  async function fetchAccounts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    setAccounts(data || [])
    setLoading(false)
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !newName.trim()) return

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: newName,
      is_credit_card: isCreditCard
    })

    if (error) alert(error.message)
    else {
      setNewName('')
      setIsCreditCard(false)
      fetchAccounts()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apagar esta conta? (Isso não apaga os lançamentos já feitos)')) return
    await supabase.from('accounts').delete().eq('id', id)
    fetchAccounts()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Contas</h1>
        <p className="text-gray-500 mb-8">Cadastre aqui os nomes das suas contas (Ex: Aluguel, Mercado, Nubank) para usar nos lançamentos.</p>

        {/* Formulário de Cadastro Rápido */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleAddAccount} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Conta</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Internet, Academia..."
                className="w-full rounded-md border-gray-300 p-2 text-sm focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-2 pb-2.5">
               <input 
                 type="checkbox" 
                 id="cc" 
                 checked={isCreditCard} 
                 onChange={(e) => setIsCreditCard(e.target.checked)}
                 className="h-4 w-4 text-purple-600 rounded"
               />
               <label htmlFor="cc" className="text-sm text-gray-600 cursor-pointer">É Cartão?</label>
            </div>

            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
              <Plus size={18}/> Adicionar
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhuma conta cadastrada.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {accounts.map((acc) => (
                <li key={acc.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{acc.name}</span>
                    {acc.is_credit_card && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        Cartão
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(acc.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={18}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}