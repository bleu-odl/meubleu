'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
// Importamos o componente que acabamos de criar
import NewExpenseModal from '../../components/NewExpenseModal'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false) // Controla se o modal está visível
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchExpenses()
  }, [])

  async function fetchExpenses() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    if (error) {
      alert('Erro ao buscar: ' + error.message)
    } else {
      setExpenses(data || [])
    }
    setLoading(false)
  }

  // Função chamada quando clicamos em "Salvar" no Modal
  async function handleSaveExpense(newExpenseData: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Envia para o Supabase
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      ...newExpenseData
    })

    if (error) {
      alert('Erro ao criar: ' + error.message)
    } else {
      fetchExpenses() // Atualiza a lista na tela
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Minhas Despesas</h1>
          <button
            onClick={() => setIsModalOpen(true)} // Abre o modal
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 shadow-md transition-colors"
          >
            + Nova Despesa
          </button>
        </div>

        {/* Tabela de Listagem */}
        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">Carregando...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-500">Nenhuma conta lançada ainda.</td></tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      R$ {expense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        expense.status === 'pago' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Componente Modal (Fica invisível até ser chamado) */}
        <NewExpenseModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveExpense}
        />

      </div>
    </div>
  )
}