'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NewExpenseModal from '../../components/NewExpenseModal'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  async function handleSaveExpense(newExpenseData: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // CENÁRIO 1: Variável (Salva uma vez só)
      if (newExpenseData.type === 'variavel') {
        const { error } = await supabase.from('expenses').insert({
          user_id: user.id,
          name: newExpenseData.name,
          value: newExpenseData.value,
          date: newExpenseData.date,
          type: 'variavel',
          status: 'pendente'
        })
        if (error) throw error
      } 
      // CENÁRIO 2: Fixa (Recorrência)
      else {
        // 1. Cria a conta MÃE
        const { data: parentData, error: parentError } = await supabase
          .from('expenses')
          .insert({
            user_id: user.id,
            name: newExpenseData.name,
            value: newExpenseData.value,
            date: newExpenseData.date,
            type: 'fixa',
            status: 'pendente',
            recurrence_months: newExpenseData.recurrence_months,
            is_fixed_value: newExpenseData.is_fixed_value
          })
          .select()
          .single()

        if (parentError) throw parentError

        // 2. Gera as FILHAS
        const futureExpenses = []
        const totalMeses = newExpenseData.recurrence_months || 1
        
        for (let i = 1; i < totalMeses; i++) {
          const baseDate = new Date(newExpenseData.date)
          baseDate.setMonth(baseDate.getMonth() + i) 
          
          futureExpenses.push({
            user_id: user.id,
            name: newExpenseData.name,
            value: newExpenseData.is_fixed_value ? newExpenseData.value : 0, 
            date: baseDate.toISOString(),
            type: 'fixa',
            status: 'pendente',
            parent_id: parentData.id
          })
        }

        // 3. Salva as FILHAS
        if (futureExpenses.length > 0) {
          const { error: childrenError } = await supabase
            .from('expenses')
            .insert(futureExpenses)
          
          if (childrenError) throw childrenError
        }
      }

      fetchExpenses()

    } catch (error: any) {
      alert('Erro ao criar despesa: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Minhas Despesas</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 shadow-md transition-colors"
          >
            + Nova Despesa
          </button>
        </div>

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
                      {expense.type === 'fixa' && (
                        <span className="ml-2 inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          Fixa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      R$ {expense.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

        <NewExpenseModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveExpense}
        />

      </div>
    </div>
  )
}