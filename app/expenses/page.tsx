'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Edit2, Trash2, Save, X, Filter, Search, CreditCard } from 'lucide-react'
import NewExpenseModal from '../../components/NewExpenseModal'
import CreditCardModal from '../../components/CreditCardModal'
import UpgradeModal from '../../components/UpgradeModal'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [userPlan, setUserPlan] = useState('free')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedCardName, setSelectedCardName] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const [accountsMap, setAccountsMap] = useState<Record<string, string>>({})

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')      
  const [filterStatus, setFilterStatus] = useState('todos') 
  const [filterType, setFilterType] = useState('todos')     

  // Edição
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', value: '' })

  const supabase = createClient()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

  const hexToRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace('#', '');
    const fullHex = cleanHex.length === 3 ? cleanHex.split('').map(char => char + char).join('') : cleanHex;
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

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
    fetchData()
  }, [selectedMonth, selectedYear])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase.from('users').select('plano').eq('id', user.id).single()
    if (userData) setUserPlan(userData.plano)

    const { data: accounts } = await supabase.from('accounts').select('name, color').eq('user_id', user.id)
    
    const colorMap: Record<string, string> = {}
    if (accounts) {
      accounts.forEach(acc => {
        colorMap[acc.name] = acc.color || '#3b82f6'
      })
    }
    setAccountsMap(colorMap)

    let query = supabase.from('expenses').select('*').eq('user_id', user.id)

    if (selectedMonth !== -1) {
      const yearStr = selectedYear
      const monthStr = String(selectedMonth + 1).padStart(2, '0') 
      const startDate = `${yearStr}-${monthStr}-01`
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
      const endDate = `${yearStr}-${monthStr}-${lastDay}`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query.order('date', { ascending: true })

    if (error) { console.error('Erro:', error.message) } 
    else { setExpenses(data || []) }
    setLoading(false)
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchStatus = filterStatus === 'todos' ? true : expense.status === filterStatus
    const matchType = filterType === 'todos' ? true : expense.type === filterType
    const matchSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const totalAmount = filteredExpenses.reduce((acc, curr) => acc + (curr.value || 0), 0)

  function handleCardClick(expense: any) {
    if (!expense.is_credit_card) return
    if (userPlan === 'free') {
      setShowUpgradeModal(true)
    } else {
      setSelectedCardId(expense.id)
      setSelectedCardName(expense.name)
    }
  }

  function handleToggleMenu(id: string) { if (openMenuId === id) setOpenMenuId(null); else setOpenMenuId(id) }
  function handleStartEdit(expense: any) { setEditingId(expense.id); setEditValues({ date: expense.date.split('T')[0], value: expense.value.toString() }); setOpenMenuId(null) }
  function handleCancelEdit() { setEditingId(null); setEditValues({ date: '', value: '' }) }

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
        const { error } = await supabase.from('expenses').insert({ user_id: user.id, name: newExpenseData.name, value: newExpenseData.value, date: newExpenseData.date, type: 'variavel', status: 'pendente', is_credit_card: newExpenseData.is_credit_card })
        if(error) throw error
      } else {
        const { data: parentData, error: parentError } = await supabase.from('expenses').insert({ user_id: user.id, name: newExpenseData.name, value: newExpenseData.value, date: newExpenseData.date, type: 'fixa', status: 'pendente', recurrence_months: newExpenseData.recurrence_months, is_fixed_value: newExpenseData.is_fixed_value, is_credit_card: newExpenseData.is_credit_card }).select().single()
        if (parentError) throw parentError
        if (!parentData) throw new Error("Erro crítico")
        
        const parentId = parentData.id 
        const futureExpenses = []
        const totalMeses = newExpenseData.recurrence_months || 1
        for (let i = 1; i < totalMeses; i++) {
          const d = new Date(newExpenseData.date); d.setDate(15); d.setMonth(d.getMonth() + i);
          const originalDay = new Date(newExpenseData.date).getDate(); const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(originalDay, maxDay))
          futureExpenses.push({ user_id: user.id, name: newExpenseData.name, value: newExpenseData.is_fixed_value ? newExpenseData.value : 0, date: d.toISOString(), type: 'fixa', status: 'pendente', parent_id: parentId, is_credit_card: newExpenseData.is_credit_card })
        }
        if (futureExpenses.length > 0) { const { error: childrenError } = await supabase.from('expenses').insert(futureExpenses); if(childrenError) throw childrenError }
      }
      fetchData() 
    } catch (error: any) { alert('Erro: ' + error.message) }
  }

  const pillBaseClass = "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors"

  return (
    // REMOVIDO bg-gray-50, agora o fundo é transparente para pegar o layout global
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-5xl">
        
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Lançamentos</h1>
            <p className="text-slate-400">Gerencie suas despesas</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-medium transition-all">
            + Novo Lançamento
          </button>
        </div>

        {/* FILTROS (DARK MODE) */}
        <div className="mb-6 bg-[#23242f] p-4 rounded-2xl shadow-lg shadow-black/20 border border-white/5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Search size={12}/> Buscar</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Ex: Netflix..." 
                  className="w-full rounded-lg border-white/10 bg-[#181924] py-2 pl-9 pr-3 text-sm text-white focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-600"
                />
            </div>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block mx-2"></div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Período</label>
                <div className="flex gap-2">
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="rounded-lg border-white/10 py-2 px-3 text-sm bg-[#181924] text-white focus:ring-indigo-500">
                        <option value={-1}>Todo o Período</option>
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="rounded-lg border-white/10 py-2 px-3 text-sm bg-[#181924] text-white focus:ring-indigo-500 disabled:opacity-50" disabled={selectedMonth === -1}>
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border-white/10 py-2 px-3 text-sm bg-[#181924] text-white w-32 focus:ring-indigo-500">
                <option value="todos">Todos</option>
                <option value="pago">✅ Pagos</option>
                <option value="pendente">⚠️ Pendentes</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Tipo</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border-white/10 py-2 px-3 text-sm bg-[#181924] text-white w-32 focus:ring-indigo-500">
                <option value="todos">Todos</option>
                <option value="variavel">Variáveis</option>
                <option value="fixa">Fixas</option>
                </select>
            </div>
          </div>
        </div>

        {/* TABELA (DARK MODE) */}
        <div className="overflow-hidden rounded-2xl bg-[#23242f] shadow-lg shadow-black/20 border border-white/5 min-h-[300px]">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500">Nenhuma despesa encontrada.</td></tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const badgeColor = accountsMap[expense.name] || '#64748B'
                  return (
                    <tr key={expense.id} className="hover:bg-white/5 transition-colors group relative">
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300">
                        {editingId === expense.id ? <input type="date" value={editValues.date} onChange={(e)=>setEditValues({...editValues, date: e.target.value})} className="bg-[#181924] text-white border border-white/10 p-1 rounded w-full"/> : new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span 
                            onClick={() => handleCardClick(expense)}
                            className={`${pillBaseClass} ${expense.is_credit_card ? 'cursor-pointer hover:ring-1 hover:ring-white/20' : ''}`}
                            style={{ 
                                backgroundColor: hexToRgba(badgeColor, 0.15), 
                                color: badgeColor 
                            }}
                          >
                            {expense.is_credit_card && <CreditCard size={12} className="mr-1.5 opacity-80"/>}
                            {expense.name}
                          </span>
                          {expense.type === 'fixa' && <span className={`${pillBaseClass} bg-blue-500/10 text-blue-400 border border-blue-500/20`}>Fixa</span>}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                        {editingId === expense.id ? <input type="number" step="0.01" value={editValues.value} onChange={(e)=>setEditValues({...editValues, value: e.target.value})} className="bg-[#181924] text-white w-24 border border-white/10 p-1 rounded"/> : `R$ ${expense.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} cursor-pointer hover:opacity-80 ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-medium relative">
                        {editingId === expense.id ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={()=>handleSaveEdit(expense.id)} className="text-emerald-400 hover:text-emerald-300"><Save size={18}/></button>
                            <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300"><X size={18}/></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(expense.id)}} className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"><MoreVertical size={18}/></button>
                            {openMenuId === expense.id && (
                              <div ref={menuRef} className="absolute right-8 top-8 z-50 w-48 bg-[#1E1F2B] shadow-xl rounded-xl border border-white/10 text-left overflow-hidden">
                                <button onClick={()=>handleStartEdit(expense)} className="w-full px-4 py-2.5 hover:bg-white/5 text-slate-300 text-sm flex items-center gap-2 transition-colors"><Edit2 size={14}/> Editar</button>
                                <button onClick={()=>handleDelete(expense.id)} className="w-full px-4 py-2.5 hover:bg-red-500/10 text-red-400 text-sm flex items-center gap-2 transition-colors"><Trash2 size={14}/> Deletar</button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ (DARK MODE) */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#1E1F2B] border-t border-white/5 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] md:pl-64 z-40">
           <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total do Período</span>
                <span className="text-[10px] text-slate-600 font-medium">Exibindo {filteredExpenses.length} contas</span>
              </div>
              <div className="text-2xl font-bold text-white">
                R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
           </div>
        </div>

        <NewExpenseModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveExpense}
        />

        <CreditCardModal 
          isOpen={!!selectedCardId} 
          onClose={() => setSelectedCardId(null)}
          expenseId={selectedCardId || ''}
          expenseName={selectedCardName}
          onUpdateTotal={fetchData} 
        />

        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)}
        />

      </div>
    </div>
  )
}