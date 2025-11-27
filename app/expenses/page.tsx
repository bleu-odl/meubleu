'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard } from 'lucide-react' // Importação do ícone (opcional, mas bom ter)
import NewExpenseModal from '../../components/NewExpenseModal'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const supabase = createClient()
  const router = useRouter()

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

  useEffect(() => {
    fetchExpenses()
  }, [selectedMonth, selectedYear])

  async function fetchExpenses() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const startDate = new Date(selectedYear, selectedMonth, 1).toISOString()
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString()

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
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
      if (newExpenseData.type === 'variavel') {
        const { error } = await supabase.from('expenses').insert({
          user_id: user.id,
          name: newExpenseData.name,
          value: newExpenseData.value,
          date: newExpenseData.date,
          type: 'variavel',
          status: 'pendente',
          is_credit_card: newExpenseData.is_credit_card
        })
        if (error) throw error
      } 
      else {
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
            is_fixed_value: newExpenseData.is_fixed_value,
            is_credit_card: newExpenseData.is_credit_card
          })
          .select()
          .single()

        if (parentError) throw parentError

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
            parent_id: parentData.id,
            is_credit_card: newExpenseData.is_credit_card
          })
        }

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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Minhas Despesas</h1>
            <p className="text-gray-500">Gerencie seus gastos mensais</p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 shadow-md transition-colors"
          >
            + Nova Despesa
          </button>
        </div>

        <div className="mb-6 flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Mês</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="rounded-md border-gray-300 py-1.5 pl-3 pr-8 text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Ano</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-md border-gray-300 py-1.5 pl-3 pr-8 text-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando contas...</td></tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                    <p className="text-lg font-medium">Tudo limpo por aqui! 🎉</p>
                    <p className="text-sm">Nenhuma despesa encontrada para {months[selectedMonth]} de {selectedYear}.</p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    
                    {/* DATA */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>

                    {/* DESCRIÇÃO (AQUI ESTAVA O PROBLEMA) */}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                         {/* Etiqueta Roxa de Cartão */}
                         {expense.is_credit_card && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 whitespace-nowrap">
                              Cartão de Crédito
                            </span>
                          )}
                          
                          <span>{expense.name}</span>

                          {/* Etiqueta Azul de Fixa */}
                          {expense.type === 'fixa' && (
                            <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">
                              Fixa
                            </span>
                          )}
                      </div>
                    </td>

                    {/* VALOR */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      R$ {expense.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* STATUS */}
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