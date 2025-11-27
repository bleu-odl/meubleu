'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NewExpenseModal from '../../components/NewExpenseModal'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // ESTADOS DOS FILTROS (Começam no dia de hoje)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0 = Janeiro
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const supabase = createClient()
  const router = useRouter()

  // Lista de meses para o dropdown
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  // Lista de anos (do ano passado até 5 anos no futuro)
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

  // Recarrega sempre que mudar o filtro de Mês ou Ano
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

    // CALCULA O INTERVALO DE DATAS
    // Primeiro dia do mês (Ex: 2024-11-01)
    const startDate = new Date(selectedYear, selectedMonth, 1).toISOString()
    // Último dia do mês (O dia 0 do mês seguinte é o último do atual)
    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString()

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate) // "Greater Than or Equal" (Maior ou igual ao dia 1)
      .lte('date', endDate)   // "Less Than or Equal" (Menor ou igual ao último dia)
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
      // 1. Variável
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
      // 2. Fixa
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
            is_fixed_value: newExpenseData.is_fixed_value
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
            parent_id: parentData.id
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
        {/* CABEÇALHO + BOTÃO */}
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

        {/* BARRA DE FILTROS */}
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

        {/* TABELA */}
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