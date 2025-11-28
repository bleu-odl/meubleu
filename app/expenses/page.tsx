'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MoreVertical, 
  Edit2, 
  Trash2, 
  FileText, 
  Save, 
  X,
  CreditCard 
} from 'lucide-react'
import NewExpenseModal from '../../components/NewExpenseModal'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Estados de Filtro
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Estados de Controle do Menu e Edição
  const [openMenuId, setOpenMenuId] = useState<string | null>(null) // Qual menu está aberto?
  const [editingId, setEditingId] = useState<string | null>(null)   // Qual linha estamos editando?
  
  // Dados temporários da edição
  const [editValues, setEditValues] = useState({ date: '', value: '' })

  const supabase = createClient()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null) // Para fechar menu ao clicar fora

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

  // Fecha o menu se clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  // --- FUNÇÕES DE AÇÃO ---

  function handleToggleMenu(id: string) {
    if (openMenuId === id) {
      setOpenMenuId(null)
    } else {
      setOpenMenuId(id)
    }
  }

  function handleStartEdit(expense: any) {
    setEditingId(expense.id)
    // Preenche os inputs com os valores atuais
    setEditValues({
      date: expense.date.split('T')[0], // Pega só a parte YYYY-MM-DD
      value: expense.value.toString()
    })
    setOpenMenuId(null) // Fecha o menu
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditValues({ date: '', value: '' })
  }

  async function handleSaveEdit(id: string) {
    // Atualiza no Banco
    const { error } = await supabase
      .from('expenses')
      .update({
        date: editValues.date,
        value: parseFloat(editValues.value)
      })
      .eq('id', id)

    if (error) {
      alert("Erro ao salvar: " + error.message)
    } else {
      // Atualiza na tela sem recarregar tudo
      setExpenses(prev => prev.map(exp => 
        exp.id === id 
          ? { ...exp, date: editValues.date, value: parseFloat(editValues.value) } 
          : exp
      ))
      setEditingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja apagar essa conta?')) return

    setExpenses(prev => prev.filter(exp => exp.id !== id))

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      alert("Erro ao apagar: " + error.message)
      fetchExpenses()
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente'
    setExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, status: newStatus } : exp
    ))
    await supabase.from('expenses').update({ status: newStatus }).eq('id', id)
  }

  async function handleSaveExpense(newExpenseData: any) {
    // ... (Lógica de salvamento idêntica à anterior, mantida para brevidade)
    // Para garantir que funcione, vou colocar a chamada de fetchExpenses aqui
    // Se quiser o código completo dessa função novamente, me avise, mas ele não mudou.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      if (newExpenseData.type === 'variavel') {
        await supabase.from('expenses').insert({
          user_id: user.id,
          name: newExpenseData.name,
          value: newExpenseData.value,
          date: newExpenseData.date,
          type: 'variavel',
          status: 'pendente',
          is_credit_card: newExpenseData.is_credit_card
        })
      } else {
        const { data: parentData } = await supabase
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
          .select().single()

        if (parentData) {
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
            await supabase.from('expenses').insert(futureExpenses)
          }
        }
      }
      fetchExpenses()
    } catch (error: any) {
      alert('Erro: ' + error.message)
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

        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100 min-h-[400px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">Nenhuma despesa encontrada.</td></tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors group relative">
                    
                    {/* DATA (Editável) */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingId === expense.id ? (
                        <input 
                          type="date" 
                          value={editValues.date}
                          onChange={(e) => setEditValues({...editValues, date: e.target.value})}
                          className="w-full rounded border-gray-300 p-1 text-sm"
                        />
                      ) : (
                        new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                      )}
                    </td>

                    {/* DESCRIÇÃO (Fixo) */}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                         {expense.is_credit_card && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 whitespace-nowrap">
                              Cartão de Crédito
                            </span>
                          )}
                          <span>{expense.name}</span>
                          {expense.type === 'fixa' && (
                            <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">
                              Fixa
                            </span>
                          )}
                      </div>
                    </td>

                    {/* VALOR (Editável) */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {editingId === expense.id ? (
                         <input 
                         type="number" 
                         step="0.01"
                         value={editValues.value}
                         onChange={(e) => setEditValues({...editValues, value: e.target.value})}
                         className="w-24 rounded border-gray-300 p-1 text-sm"
                       />
                      ) : (
                        `R$ ${expense.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => handleToggleStatus(expense.id, expense.status)}
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${
                        expense.status === 'pago' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                      </button>
                    </td>

                    {/* MENU DE AÇÕES */}
                    <td className="px-6 py-4 text-right text-sm font-medium relative">
                      {editingId === expense.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleSaveEdit(expense.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={18}/></button>
                          <button onClick={handleCancelEdit} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={18}/></button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleMenu(expense.id); }}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                          >
                            <MoreVertical size={20} />
                          </button>

                          {/* DROPDOWN MENU */}
                          {openMenuId === expense.id && (
                            <div ref={menuRef} className="absolute right-8 top-8 z-50 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100">
                              <div className="py-1">
                                <button
                                  onClick={() => handleStartEdit(expense)}
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit2 size={14} className="mr-2" />
                                  Editar lançamento
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    alert("Lógica de editar conta mãe será implementada depois!")
                                  }}
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <FileText size={14} className="mr-2" />
                                  Editar conta
                                </button>
                                <button
                                  onClick={() => handleDelete(expense.id)}
                                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Deletar lançamento
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
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