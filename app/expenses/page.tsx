'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MoreVertical, Edit2, Trash2, Save, X, Search, CreditCard, 
  Plus, Calendar, DollarSign, TrendingDown, Wallet, ListFilter, 
  SquareCheck, Square 
} from 'lucide-react'
import NewExpenseModal from '../../components/NewExpenseModal'
import CreditCardModal from '../../components/CreditCardModal'
import UpgradeModal from '../../components/UpgradeModal'

const cardClass = "card relative p-5 flex flex-col justify-between h-32 md:h-40"
const iconBadgeClass = "absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-rose-400"
const pillBaseClass = "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors border"

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
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  useEffect(() => {
    function handleClickOutside(event: any) { if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null) }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => { fetchData() }, [selectedMonth, selectedYear])

  async function fetchData() {
    setLoading(true)
    setSelectedIds([])
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('plano, financial_start_day').eq('id', user.id).single()
    if (userData) setUserPlan(userData.plano)
    const startDay = userData?.financial_start_day || 1
    const { data: accounts } = await supabase.from('accounts').select('name, color').eq('user_id', user.id)
    const colorMap: Record<string, string> = {}; if (accounts) accounts.forEach(acc => { colorMap[acc.name] = acc.color || '#3b82f6' })
    setAccountsMap(colorMap)
    let listQuery = supabase.from('expenses').select('*').eq('user_id', user.id)
    if (selectedYear !== -1) {
        if (selectedMonth !== -1) {
            const startDateObj = new Date(selectedYear, selectedMonth, startDay)
            const endDateObj = new Date(selectedYear, selectedMonth + 1, startDay - 1); endDateObj.setHours(23, 59, 59, 999)
            listQuery = listQuery.gte('date', startDateObj.toISOString()).lte('date', endDateObj.toISOString())
        } else { listQuery = listQuery.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`) }
    }
    const { data: listData } = await listQuery.order('date', { ascending: true })
    setExpenses(listData || [])
    let kpiQuery = supabase.from('expenses').select('value, date').eq('user_id', user.id)
    if (selectedYear !== -1) kpiQuery = kpiQuery.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`)
    const { data: kpiData } = await kpiQuery
    if (kpiData) {
        const total = kpiData.reduce((acc, curr) => acc + curr.value, 0)
        setKpiTotalYear(total)
        let divisor = 1
        if (selectedYear === new Date().getFullYear()) divisor = new Date().getMonth() + 1
        else if (selectedYear !== -1) divisor = 12
        else { const uniqueMonths = new Set(kpiData.map(d => d.date.substring(0, 7))).size; divisor = uniqueMonths || 1 }
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

  function handleSelectAll() { setSelectedIds(selectedIds.length === filteredExpenses.length ? [] : filteredExpenses.map(e => e.id)) }
  function handleSelectOne(id: string) { setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(sid => sid !== id) : [...selectedIds, id]) }
  async function handleDeleteSelected() { if (selectedIds.length === 0 || !confirm(`Excluir ${selectedIds.length} itens?`)) return; await supabase.from('expenses').delete().in('id', selectedIds); setSelectedIds([]); fetchData() }
  function handleCardClick(expense: any) { if (!expense.is_credit_card) return; if (userPlan === 'free') setShowUpgradeModal(true); else { setSelectedCardId(expense.id); setSelectedCardName(expense.name) } }
  function handleToggleMenu(id: string) { if (openMenuId === id) setOpenMenuId(null); else setOpenMenuId(id) }
  function handleStartEdit(expense: any) { setEditingId(expense.id); setEditValues({ date: expense.date.split('T')[0], value: expense.value.toString() }); setOpenMenuId(null) }
  async function handleSaveEdit(id: string) { await supabase.from('expenses').update({ date: editValues.date, value: parseFloat(editValues.value) }).eq('id', id); fetchData(); setEditingId(null) }
  async function handleDelete(id: string) { if (!confirm('Tem certeza?')) return; await supabase.from('expenses').delete().eq('id', id); fetchData() }
  async function handleToggleStatus(id: string, currentStatus: string) { const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente'; setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: newStatus } : exp)); await supabase.from('expenses').update({ status: newStatus }).eq('id', id) }
  async function handleSaveExpense(newExpenseData: any) {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    try {
      if (newExpenseData.type === 'variavel') { await supabase.from('expenses').insert({ user_id: user.id, name: newExpenseData.name, value: newExpenseData.value, date: newExpenseData.date, type: 'variavel', status: 'pendente', is_credit_card: newExpenseData.is_credit_card }) } 
      else {
        const { data: parentData } = await supabase.from('expenses').insert({ user_id: user.id, name: newExpenseData.name, value: newExpenseData.value, date: newExpenseData.date, type: 'fixa', status: 'pendente', recurrence_months: newExpenseData.recurrence_months, is_fixed_value: newExpenseData.is_fixed_value, is_credit_card: newExpenseData.is_credit_card }).select().single()
        const futureExpenses = []; const totalMeses = newExpenseData.recurrence_months || 1
        for (let i = 1; i < totalMeses; i++) {
          const d = new Date(newExpenseData.date); d.setDate(15); d.setMonth(d.getMonth() + i); const originalDay = new Date(newExpenseData.date).getDate(); const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(originalDay, maxDay))
          futureExpenses.push({ user_id: user.id, name: newExpenseData.name, value: newExpenseData.is_fixed_value ? newExpenseData.value : 0, date: d.toISOString(), type: 'fixa', status: 'pendente', parent_id: parentData.id, is_credit_card: newExpenseData.is_credit_card })
        }
        if (futureExpenses.length > 0) await supabase.from('expenses').insert(futureExpenses)
      }
      fetchData()
    } catch (error: any) { alert('Erro: ' + error.message) }
  }

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold text-white tracking-tight">Lançamentos</h1><p className="text-zinc-400 mt-1 text-sm">Gerencie suas despesas e faturas</p></div>
          <div className="flex items-center gap-4">
             <div className="bg-zinc-900 border border-white/5 flex items-center p-1 rounded-lg">
                <div className="flex items-center gap-2 px-3 border-r border-white/5"><Calendar size={14} className="text-rose-400"/><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filtro</span></div>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-zinc-300 text-xs font-medium py-1.5 px-2 cursor-pointer outline-none [&>option]:bg-zinc-900"><option value={-1}>Mês</option>{months.map((m, i) => (<option key={i} value={i}>{m}</option>))}</select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-zinc-300 text-xs font-medium py-1.5 px-2 cursor-pointer outline-none [&>option]:bg-zinc-900"><option value={-1}>Ano</option>{years.map((y) => (<option key={y} value={y}>{y}</option>))}</select>
             </div>
             <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 shadow-md shadow-indigo-900/20 text-sm font-bold transition-all active:scale-95"><Plus size={16}/> <span className="hidden sm:inline">Novo</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cardClass}>
                <div><p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">{searchTerm ? 'Busca' : (selectedMonth === -1 ? `Total ${selectedYear === -1 ? 'Geral' : selectedYear}` : `Total ${months[selectedMonth]}`)}</p><h3 className="text-2xl font-bold text-white tracking-tight">R$ {currentTableTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
                <div className={iconBadgeClass}><DollarSign size={18} /></div>
                <div className="mt-auto"><span className="text-[10px] text-rose-400 font-medium bg-rose-500/10 px-2 py-1 rounded">Consolidado</span></div>
            </div>
            <div className={cardClass}>
                <div><p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">{selectedYear === -1 ? 'Acumulado' : `Acumulado ${selectedYear}`}</p><h3 className="text-2xl font-bold text-white tracking-tight">R$ {kpiTotalYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
                <div className={iconBadgeClass}><TrendingDown size={18} /></div>
            </div>
            <div className={cardClass}>
                <div><p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Média Mensal</p><h3 className="text-2xl font-bold text-white tracking-tight">R$ {kpiMonthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
                <div className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-blue-400"><Wallet size={18} /></div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4"><h3 className="text-base font-bold text-white">Histórico</h3>{selectedIds.length > 0 && (<button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all"><Trash2 size={14} /> Excluir {selectedIds.length}</button>)}</div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-white/5 bg-zinc-900 py-1.5 px-3 text-xs text-zinc-300 focus:ring-1 focus:ring-rose-500 outline-none"><option value="todos">Status: Todos</option><option value="pago">Pagos</option><option value="pendente">Pendentes</option></select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-white/5 bg-zinc-900 py-1.5 px-3 text-xs text-zinc-300 focus:ring-1 focus:ring-rose-500 outline-none"><option value="todos">Tipo: Todos</option><option value="variavel">Variável</option><option value="fixa">Fixa</option></select>
                    <div className="relative flex-1 sm:w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full rounded-lg border border-white/5 bg-zinc-900 py-1.5 pl-9 pr-3 text-xs text-white focus:ring-1 focus:ring-rose-500 outline-none"/></div>
                </div>
            </div>

            <div className="card overflow-hidden rounded-xl border border-white/5 p-0 flex flex-col h-[500px]">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-3 w-10"><button onClick={handleSelectAll} className="text-zinc-500 hover:text-white transition-colors">{filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length ? <SquareCheck size={16} className="text-indigo-500" /> : <Square size={16} />}</button></th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Vencimento</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (<tr><td colSpan={6} className="p-8 text-center text-zinc-500 text-xs">Carregando...</td></tr>) : filteredExpenses.length === 0 ? (<tr><td colSpan={6} className="p-12 text-center text-zinc-500 text-xs">Vazio.</td></tr>) : (
                                filteredExpenses.map((expense) => {
                                    const badgeColor = accountsMap[expense.name] || '#71717a'; const isSelected = selectedIds.includes(expense.id)
                                    return (
                                    <tr key={expense.id} className={`transition-colors group ${isSelected ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/5'}`}>
                                        <td className="px-6 py-3"><button onClick={() => handleSelectOne(expense.id)} className="text-zinc-500 hover:text-white">{isSelected ? <SquareCheck size={16} className="text-indigo-500" /> : <Square size={16} />}</button></td>
                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-300 font-medium">{editingId === expense.id ? <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-zinc-800 text-white border border-white/10 p-1 rounded w-full"/> : new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td className="px-6 py-3 text-xs text-white"><div className="flex items-center gap-2"><span onClick={() => handleCardClick(expense)} className={`${pillBaseClass} ${expense.is_credit_card ? 'cursor-pointer hover:border-white/20' : 'border-transparent'}`} style={{ backgroundColor: hexToRgba(badgeColor, 0.1), color: badgeColor }}>{expense.is_credit_card && <CreditCard size={10} className="mr-1.5 opacity-80"/>}{expense.name}</span>{expense.type === 'fixa' && <span className={`${pillBaseClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Fixa</span>}</div></td>
                                        <td className={`px-6 py-3 whitespace-nowrap text-xs font-bold ${expense.status === 'pago' ? 'text-zinc-400 decoration-zinc-600 line-through' : 'text-zinc-200'}`}>{editingId === expense.id ? <input type="number" step="0.01" value={editValues.value} onChange={(e) => setEditValues({...editValues, value: e.target.value})} className="w-20 bg-zinc-800 border border-white/10 p-1 rounded font-bold"/> : `R$ ${expense.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</td>
                                        <td className="px-6 py-3 whitespace-nowrap"><button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} cursor-pointer hover:opacity-80 border ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{expense.status === 'pago' ? 'Pago' : 'Pendente'}</button></td>
                                        <td className="px-6 py-3 text-right text-xs font-medium relative">{editingId === expense.id ? (<div className="flex justify-end gap-1"><button onClick={() => handleSaveEdit(expense.id)} className="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded"><Save size={14}/></button><button onClick={() => setEditingId(null)} className="text-red-400 hover:bg-red-500/10 p-1 rounded"><X size={14}/></button></div>) : (<div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(expense.id)}} className="text-zinc-400 hover:text-white p-1 hover:bg-white/10 rounded"><MoreVertical size={14}/></button>{openMenuId === expense.id && (<div ref={menuRef} className="absolute right-8 top-0 z-50 w-28 bg-zinc-900 shadow-xl rounded-lg border border-white/10 overflow-hidden"><button onClick={()=>handleStartEdit(expense)} className="w-full px-3 py-2 hover:bg-white/5 text-zinc-300 text-[10px] flex items-center gap-2"><Edit2 size={10}/> Editar</button><button onClick={()=>handleDelete(expense.id)} className="w-full px-3 py-2 hover:bg-red-500/10 text-red-400 text-[10px] flex items-center gap-2"><Trash2 size={10}/> Deletar</button></div>)}</div>)}</td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur border-t border-white/5 p-3 md:pl-64 z-40"><div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-zinc-500"><div className="flex items-center gap-2"><ListFilter size={14} /><span>Exibindo <strong className="text-zinc-300">{filteredExpenses.length}</strong> itens</span></div><span>{selectedYear === -1 ? 'Todos' : selectedYear}</span></div></div>
        <NewExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveExpense}/>
        <CreditCardModal isOpen={!!selectedCardId} onClose={() => setSelectedCardId(null)} expenseId={selectedCardId || ''} expenseName={selectedCardName} onUpdateTotal={fetchData} />
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)}/>
      </div>
    </div>
  )
}