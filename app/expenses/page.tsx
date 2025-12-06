'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MoreVertical, Edit2, Trash2, Save, X, Search, CreditCard, 
  Plus, Calendar, DollarSign, TrendingDown, Wallet, ListFilter, 
  SquareCheck, Square // CORREÇÃO AQUI
} from 'lucide-react'
import NewExpenseModal from '../../components/NewExpenseModal'
import CreditCardModal from '../../components/CreditCardModal'
import UpgradeModal from '../../components/UpgradeModal'

const cardClass = "card relative p-5 flex flex-col justify-between h-32 md:h-40"
const iconBadgeClass = "absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-rose-400"
const pillBaseClass = "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors border"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userPlan, setUserPlan] = useState('free')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedCardName, setSelectedCardName] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const [accountsMap, setAccountsMap] = useState<Record<string, string>>({})
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')      
  const [filterStatus, setFilterStatus] = useState('todos') 
  const [filterType, setFilterType] = useState('todos')     

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', value: '' })

  const [kpiTotalYear, setKpiTotalYear] = useState(0)
  const [kpiMonthlyAverage, setKpiMonthlyAverage] = useState(0)

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
    setSelectedIds([])
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase.from('users').select('plano, financial_start_day').eq('id', user.id).single()
    if (userData) setUserPlan(userData.plano)
    const startDay = userData?.financial_start_day || 1

    const { data: accounts } = await supabase.from('accounts').select('name, color').eq('user_id', user.id)
    const colorMap: Record<string, string> = {}
    if (accounts) {
      accounts.forEach(acc => { colorMap[acc.name] = acc.color || '#3b82f6' })
    }
    setAccountsMap(colorMap)

    let listQuery = supabase.from('expenses').select('*').eq('user_id', user.id)

    if (selectedYear !== -1) {
        if (selectedMonth !== -1) {
            const startDateObj = new Date(selectedYear, selectedMonth, startDay)
            const endDateObj = new Date(selectedYear, selectedMonth + 1, startDay - 1)
            endDateObj.setHours(23, 59, 59, 999)

            listQuery = listQuery.gte('date', startDateObj.toISOString()).lte('date', endDateObj.toISOString())
        } else {
            listQuery = listQuery.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`)
        }
    }
    
    const { data: listData, error: listError } = await listQuery.order('date', { ascending: true })
    if (listError) console.error('Erro lista:', listError.message)
    else setExpenses(listData || [])

    let kpiQuery = supabase.from('expenses').select('value, date').eq('user_id', user.id)

    if (selectedYear !== -1) {
        kpiQuery = kpiQuery.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`)
    } 

    const { data: kpiData, error: kpiError } = await kpiQuery
    
    if (kpiData && !kpiError) {
        const total = kpiData.reduce((acc, curr) => acc + curr.value, 0)
        setKpiTotalYear(total)

        let divisor = 1
        if (selectedYear === new Date().getFullYear()) {
            divisor = new Date().getMonth() + 1
        } else if (selectedYear !== -1) {
            divisor = 12
        } else {
            const uniqueMonths = new Set(kpiData.map(d => d.date.substring(0, 7))).size
            divisor = uniqueMonths || 1
        }
        
        setKpiMonthlyAverage(total / (divisor || 1))
    }

    setLoading(false)
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchStatus = filterStatus === 'todos' ? true : expense.status === filterStatus
    const matchType = filterType === 'todos' ? true : expense.type === filterType
    const matchSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const currentTableTotal = filteredExpenses.reduce((acc, curr) => acc + (curr.value || 0), 0)

  function handleSelectAll() {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredExpenses.map(e => e.id))
    }
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} itens?`)) return

    const { error } = await supabase.from('expenses').delete().in('id', selectedIds)
    
    if (error) {
      alert("Erro ao excluir: " + error.message)
    } else {
      setSelectedIds([])
      fetchData()
    }
  }

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
      fetchData()
      setEditingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza?')) return
    await supabase.from('expenses').delete().eq('id', id)
    fetchData()
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

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-6xl space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-white tracking-tight">Lançamentos</h1>
            <p className="text-slate-400 mt-1">Gerencie suas despesas e faturas</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="card flex items-center p-1.5 rounded-xl h-fit">
                <div className="flex items-center gap-2 px-3 border-r border-white/10">
                   <Calendar size={16} className="text-rose-400"/>
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período</span>
                </div>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-white text-sm font-medium py-2 px-3 cursor-pointer outline-none [&>option]:bg-[#23242f]">
                   <option value={-1}>Todo o Período</option>
                   {months.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-white text-sm font-medium py-2 px-3 cursor-pointer outline-none [&>option]:bg-[#23242f]">
                   <option value={-1}>Todos</option>
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
             </div>
             
             <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 font-bold transition-all active:scale-95">
                <Plus size={20}/> <span className="hidden sm:inline">Novo Lançamento</span>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={cardClass}>
                <div>
                    <p className="text-[13px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        {searchTerm ? 'Total da Busca' : (selectedMonth === -1 ? `Total ${selectedYear === -1 ? 'Geral' : selectedYear}` : `Total em ${months[selectedMonth]}`)}
                    </p>
                    <h3 className="text-[32px] font-bold text-white tracking-tight">R$ {currentTableTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className={iconBadgeClass}><DollarSign size={20} strokeWidth={2.5} /></div>
                <div className="mt-auto">
                    <span className="text-xs text-rose-400 font-medium bg-rose-500/10 px-2 py-1 rounded-md">
                        Despesa Consolidada
                    </span>
                </div>
            </div>

            <div className={cardClass}>
                <div>
                    <p className="text-[13px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        {selectedYear === -1 ? 'Acumulado Histórico' : `Acumulado ${selectedYear}`}
                    </p>
                    <h3 className="text-[28px] font-bold text-white tracking-tight">R$ {kpiTotalYear.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className={iconBadgeClass}><TrendingDown size={20} /></div>
                <div className="mt-auto">
                    <span className="text-[10px] text-slate-500">
                        {selectedYear === -1 ? 'Soma de todos os tempos' : `Soma de Jan a Dez de ${selectedYear}`}
                    </span>
                </div>
            </div>

            <div className={cardClass}>
                <div>
                    <p className="text-[13px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Média Mensal</p>
                    <h3 className="text-[28px] font-bold text-white tracking-tight">R$ {kpiMonthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-blue-400"><Wallet size={20} /></div>
                <div className="mt-auto">
                    <span className="text-[10px] text-slate-500">
                        Baseada no histórico anual
                    </span>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-white">Histórico de Saídas</h3>
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all animate-in fade-in slide-in-from-left-2"
                        >
                            <Trash2 size={14} />
                            Excluir {selectedIds.length} selecionados
                        </button>
                    )}
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-white/5 bg-[#1E1F2B] py-2 px-3 text-xs text-white focus:ring-1 focus:ring-rose-500 outline-none">
                        <option value="todos">Status: Todos</option>
                        <option value="pago">Pagos</option>
                        <option value="pendente">Pendentes</option>
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-white/5 bg-[#1E1F2B] py-2 px-3 text-xs text-white focus:ring-1 focus:ring-rose-500 outline-none">
                        <option value="todos">Tipo: Todos</option>
                        <option value="variavel">Variável</option>
                        <option value="fixa">Fixa</option>
                    </select>
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Buscar..." 
                            className="w-full rounded-lg border border-white/5 bg-[#1E1F2B] py-2 pl-9 pr-3 text-xs text-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden rounded-xl border border-white/5 p-0 flex flex-col h-[500px]">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-[#1E1F2B] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <button onClick={handleSelectAll} className="text-slate-400 hover:text-white transition-colors flex items-center justify-center">
                                        {filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length ? (
                                            <SquareCheck size={18} className="text-indigo-500" /> 
                                        ) : (
                                            <Square size={18} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Vencimento</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Descrição</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Valor</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Carregando dados...</td></tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-500 text-sm">Nenhuma despesa encontrada.</td></tr>
                            ) : (
                                filteredExpenses.map((expense) => {
                                    const badgeColor = accountsMap[expense.name] || '#64748B'
                                    const isSelected = selectedIds.includes(expense.id)
                                    
                                    return (
                                    <tr key={expense.id} className={`transition-colors group ${isSelected ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'hover:bg-white/5'}`}>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleSelectOne(expense.id)} className="text-slate-400 hover:text-white transition-colors flex items-center justify-center">
                                                {isSelected ? <SquareCheck size={18} className="text-indigo-500" /> : <Square size={18} />}
                                            </button>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">
                                            {editingId === expense.id ? (
                                                <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-[#13141c] text-white border border-white/20 p-1 rounded w-full text-xs"/>
                                            ) : (
                                                new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                                            )}
                                        </td>
                                        
                                        <td className="px-6 py-4 text-sm text-white">
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    onClick={() => handleCardClick(expense)}
                                                    className={`${pillBaseClass} ${expense.is_credit_card ? 'cursor-pointer hover:ring-1 hover:ring-white/20' : ''}`}
                                                    style={{ 
                                                        backgroundColor: hexToRgba(badgeColor, 0.15), 
                                                        color: badgeColor,
                                                        borderColor: hexToRgba(badgeColor, 0.3)
                                                    }}
                                                >
                                                    {expense.is_credit_card && <CreditCard size={10} className="mr-1.5 opacity-80"/>}
                                                    {expense.name}
                                                </span>
                                                {expense.type === 'fixa' && <span className={`${pillBaseClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Fixa</span>}
                                            </div>
                                        </td>

                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${expense.status === 'pago' ? 'text-white' : 'text-rose-400'}`}>
                                            {editingId === expense.id ? (
                                                <input type="number" step="0.01" value={editValues.value} onChange={(e) => setEditValues({...editValues, value: e.target.value})} className="w-24 bg-[#13141c] border border-white/20 p-1 rounded text-xs text-rose-400 font-bold"/>
                                            ) : (
                                                `R$ ${expense.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            )}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} cursor-pointer hover:opacity-80 border ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </button>
                                        </td>

                                        <td className="px-6 py-4 text-right text-sm font-medium relative">
                                            {editingId === expense.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleSaveEdit(expense.id)} className="text-emerald-400 hover:text-emerald-300 p-1.5 bg-emerald-500/10 rounded-md transition-colors"><Save size={16}/></button>
                                                    <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 p-1.5 bg-red-500/10 rounded-md transition-colors"><X size={16}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(expense.id)}} className="text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-md transition-colors"><MoreVertical size={16}/></button>
                                                    {openMenuId === expense.id && (
                                                        <div ref={menuRef} className="absolute right-8 top-0 z-50 w-32 bg-[#1E1F2B] shadow-xl rounded-xl border border-white/10 text-left overflow-hidden">
                                                            <button onClick={()=>handleStartEdit(expense)} className="w-full px-4 py-2 hover:bg-white/5 text-slate-300 text-xs flex items-center gap-2 transition-colors"><Edit2 size={12}/> Editar</button>
                                                            <button onClick={()=>handleDelete(expense.id)} className="w-full px-4 py-2 hover:bg-red-500/10 text-red-400 text-xs flex items-center gap-2 transition-colors"><Trash2 size={12}/> Deletar</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-[#1E1F2B] border-t border-white/5 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] md:pl-64 z-40 transition-all">
           <div className="mx-auto max-w-6xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <ListFilter size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                    Exibindo <strong className="text-white">{filteredExpenses.length}</strong> lançamentos
                </span>
                {selectedIds.length > 0 && (
                    <span className="ml-4 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {selectedIds.length} selecionados
                    </span>
                )}
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">
                 Filtro: {selectedYear === -1 ? 'Todo o Histórico' : (selectedMonth === -1 ? `Ano de ${selectedYear}` : `${months[selectedMonth]} de ${selectedYear}`)}
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