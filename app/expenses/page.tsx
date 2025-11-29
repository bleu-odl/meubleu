'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Edit2, Trash2, Save, X, Filter, Search } from 'lucide-react'
import NewExpenseModal from '../../components/NewExpenseModal'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // --- FILTROS DE DATA ---
  // -1 significa "Todo o Período"
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // --- NOVOS FILTROS (Filtram na Tela) ---
  const [searchTerm, setSearchTerm] = useState('')      
  const [filterStatus, setFilterStatus] = useState('todos') 
  const [filterType, setFilterType] = useState('todos')     

  // Estados de Edição
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', value: '' })

  const supabase = createClient()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

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

    // Começa montando a query básica (pega tudo do usuário)
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)

    // Se o mês NÃO for -1 (ou seja, não é "Todo o Período"), aplicamos o filtro de data
    if (selectedMonth !== -1) {
      const yearStr = selectedYear
      const monthStr = String(selectedMonth + 1).padStart(2, '0') 
      const startDate = `${yearStr}-${monthStr}-01`
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
      const endDate = `${yearStr}-${monthStr}-${lastDay}`

      query = query.gte('date', startDate).lte('date', endDate)
    }

    // Executa a query com ordenação
    const { data, error } = await query.order('date', { ascending: true })

    if (error) {
      console.error('Erro ao buscar:', error.message)
    } else {
      setExpenses(data || [])
    }
    setLoading(false)
  }

  // Filtros em memória
  const filteredExpenses = expenses.filter(expense => {
    const matchStatus = filterStatus === 'todos' ? true : expense.status === filterStatus
    const matchType = filterType === 'todos' ? true : expense.type === filterType
    const matchSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const totalAmount = filteredExpenses.reduce((acc, curr) => acc + (curr.value || 0), 0)

  // Ações
  function handleToggleMenu(id: string) {
    if (openMenuId === id) setOpenMenuId(null); else setOpenMenuId(id)
  }

  function handleStartEdit(expense: any) {
    setEditingId(expense.id)
    setEditValues({ date: expense.date.split('T')[0], value: expense.value.toString() })
    setOpenMenuId(null)
  }

  function handleCancelEdit() {
    setEditingId(null); setEditValues({ date: '', value: '' })
  }

  async function handleSaveEdit(id: string) {
    const { error } = await supabase.from('expenses').update({ date: editValues.date, value: parseFloat(editValues.value) }).eq('id', id)
    if (error) { alert("Erro: " + error.message) } else {
      setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, date: editValues.date, value: parseFloat(editValues.value) } : exp))
      setEditingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza?')) return
    setExpenses(prev => prev.filter(exp => exp.id !== id))
    await supabase.from('expenses').delete().eq('id', id)
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente'
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: newStatus } : exp))
    await supabase.from('expenses').update({ status: newStatus }).eq('id', id)
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
        if(error) throw error
      } 
      else {
        // Fixa (Recorrência)
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
          .select().single()

        if (parentError) throw parentError

        const futureExpenses = []
        const totalMeses = newExpenseData.recurrence_months || 1
        
        for (let i = 1; i < totalMeses; i++) {
          const d = new Date(newExpenseData.date)
          d.setDate(15) 
          d.setMonth(d.getMonth() + i)
          
          const originalDay = new Date(newExpenseData.date).getDate()
          const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
          d.setDate(Math.min(originalDay, maxDay))

          futureExpenses.push({
            user_id: user.id,
            name: newExpenseData.name,
            value: newExpenseData.is_fixed_value ? newExpenseData.value : 0, 
            date: d.toISOString(),
            type: 'fixa',
            status: 'pendente',
            parent_id: parentData.id,
            is_credit_card: newExpenseData.is_credit_card
          })
        }

        if (futureExpenses.length > 0) {
          const { error: childrenError } = await supabase.from('expenses').insert(futureExpenses)
          if(childrenError) throw childrenError
        }
      }

      fetchExpenses() 

    } catch (error: any) {
      alert('Erro ao criar despesa: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Extrato</h1>
            <p className="text-gray-500">Gerencie suas despesas</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 shadow-md">
            Novo Lançamento
          </button>
        </div>

        {/* --- FILTROS --- */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
          
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1"><Search size={12}/> Buscar</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ex: Netflix..." className="w-full rounded-md border-gray-300 py-1.5 pl-9 pr-3 text-sm bg-gray-50"/>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 hidden sm:block mx-2"></div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Período</label>
                <div className="flex gap-2">
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="rounded-md border-gray-300 py-1.5 text-sm bg-gray-50">
                        {/* OPÇÃO DE TODO O PERÍODO */}
                        <option value={-1}>Todo o Período</option>
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    {/* Desabilita o Ano se "Todo o Período" estiver selecionado */}
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                        className="rounded-md border-gray-300 py-1.5 text-sm bg-gray-50 disabled:opacity-50 disabled:bg-gray-100"
                        disabled={selectedMonth === -1}
                    >
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border-gray-300 py-1.5 text-sm bg-gray-50 w-32">
                <option value="todos">Todos</option>
                <option value="pago">✅ Pagos</option>
                <option value="pendente">⚠️ Pendentes</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border-gray-300 py-1.5 text-sm bg-gray-50 w-32">
                <option value="todos">Todos</option>
                <option value="variavel">Variáveis</option>
                <option value="fixa">Fixas</option>
                </select>
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100 min-h-[300px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* CABEÇALHO ATUALIZADO */}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data de Vencimento</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">Nenhuma despesa encontrada.</td></tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors group relative">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {editingId === expense.id ? <input type="date" value={editValues.date} onChange={(e)=>setEditValues({...editValues, date: e.target.value})} className="border p-1 rounded w-full"/> : new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                         {expense.is_credit_card && <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 whitespace-nowrap">Cartão de Crédito</span>}
                         <span>{expense.name}</span>
                         {expense.type === 'fixa' && <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">Fixa</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                       {editingId === expense.id ? <input type="number" step="0.01" value={editValues.value} onChange={(e)=>setEditValues({...editValues, value: e.target.value})} className="w-24 border p-1 rounded"/> : `R$ ${expense.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`px-2 py-1 text-xs font-semibold rounded-full ${expense.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium relative">
                      {editingId === expense.id ? (
                        <div className="flex justify-end gap-2">
                           <button onClick={()=>handleSaveEdit(expense.id)} className="text-green-600"><Save size={18}/></button>
                           <button onClick={handleCancelEdit} className="text-red-500"><X size={18}/></button>
                        </div>
                      ) : (
                        <>
                           <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(expense.id)}} className="text-gray-400 hover:text-gray-600"><MoreVertical size={20}/></button>
                           {openMenuId === expense.id && (
                             <div ref={menuRef} className="absolute right-8 top-8 z-50 w-48 bg-white shadow-lg rounded-md border text-left">
                               <button onClick={()=>handleStartEdit(expense)} className="block w-full px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm flex gap-2"><Edit2 size={14}/> Editar</button>
                               <button onClick={()=>handleDelete(expense.id)} className="block w-full px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex gap-2"><Trash2 size={14}/> Deletar</button>
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

        {/* Rodapé Total */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:pl-64 z-40">
           <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider block mb-1">Total do Período</span>
                <span className="text-xs text-gray-400">Exibindo {filteredExpenses.length} contas</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
           </div>
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