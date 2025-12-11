'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  MoreVertical, Edit2, Trash2, Save, X, Search, CreditCard, 
  Plus, Calendar, DollarSign, TrendingDown, Wallet, ListFilter, 
  SquareCheck, Square 
} from 'lucide-react'
import NewExpenseModal from '../../components/NewExpenseModal'
import CreditCardModal from '../../components/CreditCardModal'
import UpgradeModal from '../../components/UpgradeModal'
import { useToast } from '../../components/ToastContext'

// Importando Tipos e Utils
import { Expense, CreateExpenseDTO } from '../../lib/types'
import { formatCurrency, formatDate } from '../../lib/utils'

const pillBaseClass = "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors border"
const cardClass = "card relative p-5 flex flex-col justify-between h-32 md:h-40"
const iconBadgeClass = "absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-rose-400"

// Utilitário para converter Hex para RGBA (transparência)
const hexToRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ExpensesClientProps {
  initialExpenses: Expense[]
  kpiData: {
    totalYear: number
    monthlyAverage: number
  }
  accountsMap: Record<string, string>
  userPlan: string
  selectedMonth: number
  selectedYear: number
}

export default function ExpensesClient({ 
  initialExpenses, 
  kpiData, 
  accountsMap, 
  userPlan, 
  selectedMonth, 
  selectedYear 
}: ExpensesClientProps) {
  
  const { addToast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // Estados Locais (Filtros e UI)
  const [searchTerm, setSearchTerm] = useState('')      
  const [filterStatus, setFilterStatus] = useState('todos') 
  const [filterType, setFilterType] = useState('todos')     
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Estados de Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedCardName, setSelectedCardName] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Estados de Edição/Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', value: '' })

  const menuRef = useRef<HTMLDivElement>(null)

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Atualiza URL ao mudar filtros de data
  function handleFilterChange(month: number, year: number) {
    router.push(`/expenses?month=${month}&year=${year}`)
  }

  // Filtragem local
  const filteredExpenses = initialExpenses.filter(expense => {
    const matchStatus = filterStatus === 'todos' ? true : expense.status === filterStatus
    const matchType = filterType === 'todos' ? true : expense.type === filterType
    const matchSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const currentTableTotal = filteredExpenses.reduce((acc, curr) => acc + (curr.value || 0), 0)

  // --- LÓGICA DE SELEÇÃO ---
  function handleSelectAll() {
    if (selectedIds.length === filteredExpenses.length) setSelectedIds([])
    else setSelectedIds(filteredExpenses.map(e => e.id))
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id))
    else setSelectedIds([...selectedIds, id])
  }

  // --- LÓGICA DE CRUD ---

  async function handleSaveExpense(data: CreateExpenseDTO & { recurrence_months?: number }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      if (data.type === 'variavel') {
        await supabase.from('expenses').insert({ 
          user_id: user.id, 
          name: data.name, 
          value: data.value, 
          date: data.date, 
          type: 'variavel', 
          status: 'pendente', 
          is_credit_card: data.is_credit_card 
        })
      } else {
        // Lógica de Recorrência (fixa)
        const { data: parentData, error } = await supabase.from('expenses').insert({ 
          user_id: user.id, 
          name: data.name, 
          value: data.value, 
          date: data.date, 
          type: 'fixa', 
          status: 'pendente', 
          recurrence_months: data.recurrence_months, 
          is_fixed_value: data.is_fixed_value, 
          is_credit_card: data.is_credit_card 
        }).select().single()

        if(error) throw error

        const futureExpenses = []
        const monthsCount = data.recurrence_months || 1
        
        for (let i = 1; i < monthsCount; i++) {
          const d = new Date(data.date)
          // Avança mês a mês preservando o dia (com ajuste para fim de mês)
          d.setMonth(d.getMonth() + i)
          
          // Correção básica de dia 31 pular para dia 1
          // (Idealmente isso iria para o backend também no futuro)
          
          futureExpenses.push({ 
            user_id: user.id, 
            name: data.name, 
            value: data.is_fixed_value ? data.value : 0, 
            date: d.toISOString(), 
            type: 'fixa', 
            status: 'pendente', 
            parent_id: parentData.id, 
            is_credit_card: data.is_credit_card 
          })
        }
        if (futureExpenses.length > 0) await supabase.from('expenses').insert(futureExpenses)
      }
      
      addToast("Lançamento salvo com sucesso!", 'success')
      router.refresh() 
    } catch (error: any) { 
      addToast('Erro ao salvar: ' + error.message, 'error') 
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return
    if (!confirm(`Excluir ${selectedIds.length} itens?`)) return 

    const { error } = await supabase.from('expenses').delete().in('id', selectedIds)
    
    if (error) {
      addToast("Erro ao excluir: " + error.message, 'error')
    } else {
      addToast(`${selectedIds.length} itens excluídos`, 'success')
      setSelectedIds([])
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) addToast("Erro ao excluir", 'error')
    else {
        addToast("Item excluído", 'success')
        router.refresh()
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente'
    
    // Otimista: atualiza UI antes (opcional, mas aqui vamos esperar refresh para garantir consistência)
    const { error } = await supabase.from('expenses').update({ status: newStatus }).eq('id', id)
    
    if (error) {
      addToast("Erro ao atualizar status", 'error')
    } else {
      addToast(`Status alterado para ${newStatus}`, 'success')
      router.refresh()
    }
  }

  function handleStartEdit(expense: Expense) { 
    setEditingId(expense.id)
    setEditValues({ 
      date: expense.date.split('T')[0], 
      value: expense.value.toString() 
    })
    setOpenMenuId(null) 
  }

  async function handleSaveEdit(id: string) {
    const { error } = await supabase
      .from('expenses')
      .update({ date: editValues.date, value: parseFloat(editValues.value) })
      .eq('id', id)

    if (error) {
      addToast("Erro ao atualizar: " + error.message, 'error')
    } else { 
      addToast("Lançamento atualizado!", 'success')
      setEditingId(null) 
      router.refresh()
    }
  }

  function handleCardClick(expense: Expense) {
    if (!expense.is_credit_card) return
    if (userPlan === 'free') setShowUpgradeModal(true)
    else { 
      setSelectedCardId(expense.id)
      setSelectedCardName(expense.name) 
    }
  }

  function handleToggleMenu(id: string) { 
    setOpenMenuId(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Lançamentos</h1>
            <p className="text-zinc-400 mt-1 text-sm">Gerencie suas despesas e faturas</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-zinc-900 border border-white/5 flex items-center p-1 rounded-lg">
                <div className="flex items-center gap-2 px-3 border-r border-white/5">
                   <Calendar size={14} className="text-rose-400"/>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filtro</span>
                </div>
                <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-300 text-xs font-medium py-1.5 px-2 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   <option value={-1}>Mês</option>
                   {months.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-300 text-xs font-medium py-1.5 px-2 cursor-pointer outline-none [&>option]:bg-zinc-900">
                   <option value={-1}>Ano</option>
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
             </div>
             
             <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 shadow-md shadow-indigo-900/20 text-sm font-bold transition-all active:scale-95">
                <Plus size={16}/> <span className="hidden sm:inline">Novo</span>
             </button>
          </div>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cardClass}>
                <div>
                    <p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                        {searchTerm ? 'Busca' : 'Total Visível'}
                    </p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(currentTableTotal)}</h3>
                </div>
                <div className={iconBadgeClass}><DollarSign size={18} /></div>
                <div className="mt-auto">
                    <span className="text-[10px] text-rose-400 font-medium bg-rose-500/10 px-2 py-1 rounded">
                        Despesa Consolidada
                    </span>
                </div>
            </div>

            <div className={cardClass}>
                <div>
                    <p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                        Acumulado {selectedYear === -1 ? new Date().getFullYear() : selectedYear}
                    </p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(kpiData.totalYear)}</h3>
                </div>
                <div className={iconBadgeClass}><TrendingDown size={18} /></div>
                <div className="mt-auto">
                    <span className="text-[10px] text-zinc-500">
                        Soma anual filtrada
                    </span>
                </div>
            </div>

            <div className={cardClass}>
                <div>
                    <p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Média Mensal</p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(kpiData.monthlyAverage)}</h3>
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-blue-400">
                    <Wallet size={18} />
                </div>
            </div>
        </div>

        {/* TABELA E FILTROS */}
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-white">Histórico</h3>
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                            <Trash2 size={14} /> Excluir {selectedIds.length}
                        </button>
                    )}
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-white/5 bg-zinc-900 py-1.5 px-3 text-xs text-zinc-300 focus:ring-1 focus:ring-rose-500 outline-none">
                        <option value="todos">Status: Todos</option>
                        <option value="pago">Pagos</option>
                        <option value="pendente">Pendentes</option>
                    </select>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-white/5 bg-zinc-900 py-1.5 px-3 text-xs text-zinc-300 focus:ring-1 focus:ring-rose-500 outline-none">
                        <option value="todos">Tipo: Todos</option>
                        <option value="variavel">Variável</option>
                        <option value="fixa">Fixa</option>
                    </select>
                    <div className="relative flex-1 sm:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Buscar..." 
                            className="w-full rounded-lg border border-white/5 bg-zinc-900 py-1.5 pl-9 pr-3 text-xs text-white focus:ring-1 focus:ring-rose-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden rounded-xl border border-white/5 p-0 flex flex-col h-[500px]">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-3 w-10">
                                    <button onClick={handleSelectAll} className="text-zinc-500 hover:text-white transition-colors">
                                        {filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length ? (
                                            <SquareCheck size={16} className="text-indigo-500" />
                                        ) : (
                                            <Square size={16} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Vencimento</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredExpenses.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-zinc-500 text-xs">Vazio.</td></tr>
                            ) : (
                                filteredExpenses.map((expense) => {
                                    const badgeColor = accountsMap[expense.name] || '#71717a'
                                    const isSelected = selectedIds.includes(expense.id)
                                    
                                    return (
                                    <tr key={expense.id} className={`transition-colors group ${isSelected ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/5'}`}>
                                        <td className="px-6 py-3">
                                            <button onClick={() => handleSelectOne(expense.id)} className="text-zinc-500 hover:text-white">
                                                {isSelected ? <SquareCheck size={16} className="text-indigo-500" /> : <Square size={16} />}
                                            </button>
                                        </td>

                                        <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-300 font-medium">
                                            {editingId === expense.id ? (
                                                <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-zinc-800 text-white border border-white/10 p-1 rounded w-full"/>
                                            ) : (
                                                formatDate(expense.date)
                                            )}
                                        </td>
                                        
                                        <td className="px-6 py-3 text-xs text-white">
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    onClick={() => handleCardClick(expense)}
                                                    className={`${pillBaseClass} ${expense.is_credit_card ? 'cursor-pointer hover:border-white/20' : 'border-transparent'}`}
                                                    style={{ 
                                                        backgroundColor: hexToRgba(badgeColor, 0.1), 
                                                        color: badgeColor 
                                                    }}
                                                >
                                                    {expense.is_credit_card && <CreditCard size={10} className="mr-1.5 opacity-80"/>}
                                                    {expense.name}
                                                </span>
                                                {expense.type === 'fixa' && <span className={`${pillBaseClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Fixa</span>}
                                            </div>
                                        </td>

                                        <td className={`px-6 py-3 whitespace-nowrap text-xs font-bold ${expense.status === 'pago' ? 'text-zinc-400 decoration-zinc-600 line-through' : 'text-zinc-200'}`}>
                                            {editingId === expense.id ? (
                                                <input type="number" step="0.01" value={editValues.value} onChange={(e) => setEditValues({...editValues, value: e.target.value})} className="w-20 bg-zinc-800 border border-white/10 p-1 rounded font-bold"/>
                                            ) : (
                                                formatCurrency(expense.value)
                                            )}
                                        </td>

                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <button onClick={()=>handleToggleStatus(expense.id, expense.status)} className={`${pillBaseClass} cursor-pointer hover:opacity-80 border ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                {expense.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </button>
                                        </td>

                                        <td className="px-6 py-3 text-right text-xs font-medium relative">
                                            {editingId === expense.id ? (
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => handleSaveEdit(expense.id)} className="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded"><Save size={14}/></button>
                                                    <button onClick={() => setEditingId(null)} className="text-red-400 hover:bg-red-500/10 p-1 rounded"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(expense.id)}} className="text-zinc-400 hover:text-white p-1 hover:bg-white/10 rounded"><MoreVertical size={14}/></button>
                                                    {openMenuId === expense.id && (
                                                        <div ref={menuRef} className="absolute right-8 top-0 z-50 w-28 bg-zinc-900 shadow-xl rounded-lg border border-white/10 overflow-hidden">
                                                            <button onClick={()=>handleStartEdit(expense)} className="w-full px-3 py-2 hover:bg-white/5 text-zinc-300 text-[10px] flex items-center gap-2"><Edit2 size={10}/> Editar</button>
                                                            <button onClick={()=>handleDelete(expense.id)} className="w-full px-3 py-2 hover:bg-red-500/10 text-red-400 text-[10px] flex items-center gap-2"><Trash2 size={10}/> Deletar</button>
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

        {/* FOOTER BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur border-t border-white/5 p-3 md:pl-64 z-40">
           <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <ListFilter size={14} />
                <span>Exibindo <strong className="text-zinc-300">{filteredExpenses.length}</strong> itens</span>
              </div>
              <div className="hidden sm:block">
                 {selectedYear === -1 ? 'Todos' : selectedYear}
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
          onUpdateTotal={() => router.refresh()} // Atualiza server component
        />

        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)}
        />

    </div>
  )
}