'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Plus, Trash2, Search, DollarSign, X, Save, MoreVertical, Edit2, 
  TrendingUp, Calendar, Wallet, ListFilter, Square, SquareCheck // <--- Novos ícones importados
} from 'lucide-react'
import { useToast } from '../../components/ToastContext'
import { Income } from '../../lib/types'
import { formatCurrency, formatDate } from '../../lib/utils'

// Constantes
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)
const pillBaseClass = "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors border"
const cardClass = "card relative p-5 flex flex-col justify-between h-32 md:h-40"
const iconBadgeClass = "absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-emerald-400"

interface IncomesClientProps {
  initialIncomes: Income[]
  kpiData: {
    totalSelected: number
    totalYear: number
    monthlyAverage: number
  }
  selectedMonth: number
  selectedYear: number
}

export default function IncomesClient({ initialIncomes, kpiData, selectedMonth, selectedYear }: IncomesClientProps) {
  const { addToast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // Estados de Interface
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ description: '', amount: '', date: '' })
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  
  // Estados de Seleção (NOVO)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Estados de Edição/Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', amount: '' })
  
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filtragem local
  const filteredIncomes = initialIncomes.filter(inc => 
    inc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Atualizar URL ao mudar filtros
  function handleFilterChange(month: number, year: number) {
    router.push(`/incomes?month=${month}&year=${year}`)
  }

  // --- LÓGICA DE SELEÇÃO (NOVA) ---
  function handleSelectAll() {
    if (selectedIds.length === filteredIncomes.length) setSelectedIds([])
    else setSelectedIds(filteredIncomes.map(e => e.id))
  }

  function handleSelectOne(id: string) {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id))
    else setSelectedIds([...selectedIds, id])
  }

  // --- AÇÕES (CRUD) ---

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsLoadingSave(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newIncome = {
      user_id: user.id,
      description: formData.description,
      amount: parseFloat(formData.amount.replace(',', '.')),
      date: formData.date
    }

    const { error } = await supabase.from('incomes').insert(newIncome)
    
    if (error) { 
        addToast('Erro ao salvar: ' + error.message, 'error') 
    } else {
      setFormData({ description: '', amount: '', date: '' })
      setIsModalOpen(false)
      addToast('Receita adicionada com sucesso!', 'success')
      router.refresh()
    }
    setIsLoadingSave(false)
  }

  // Ação de Deletar Um (existente)
  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja apagar esta entrada?')) return
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (error) addToast("Erro ao apagar receita", 'error')
    else {
        addToast("Receita removida", 'success')
        router.refresh()
    }
  }

  // Ação de Deletar Selecionados (NOVA)
  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return
    if (!confirm(`Excluir ${selectedIds.length} itens?`)) return 

    const { error } = await supabase.from('incomes').delete().in('id', selectedIds)
    
    if (error) {
      addToast("Erro ao excluir: " + error.message, 'error')
    } else {
      addToast(`${selectedIds.length} receitas excluídas`, 'success')
      setSelectedIds([])
      router.refresh()
    }
  }

  function handleStartEdit(income: Income) { 
    setEditingId(income.id)
    setEditValues({ 
        date: income.date.split('T')[0], 
        amount: income.amount.toString() 
    })
    setOpenMenuId(null) 
  }

  async function handleSaveEdit(id: string) {
    const { error } = await supabase
      .from('incomes')
      .update({ date: editValues.date, amount: parseFloat(editValues.amount) })
      .eq('id', id)

    if (error) { 
        addToast("Erro ao salvar: " + error.message, 'error') 
    } else { 
        addToast("Receita atualizada!", 'success')
        setEditingId(null)
        router.refresh() 
    }
  }

  function handleToggleMenu(id: string) { setOpenMenuId(prev => prev === id ? null : id) }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Receitas</h1>
            <p className="text-zinc-400 mt-1 text-sm">Gerencie suas fontes de renda</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="bg-zinc-900 border border-white/5 flex items-center p-1 rounded-lg">
                <div className="flex items-center gap-2 px-3 border-r border-white/5">
                   <Calendar size={14} className="text-emerald-400"/>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filtro</span>
                </div>
                <select 
                    value={selectedMonth} 
                    onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} 
                    className="bg-transparent text-zinc-300 text-xs font-medium py-1.5 px-2 cursor-pointer outline-none [&>option]:bg-zinc-900"
                >
                   <option value={-1}>Mês</option>
                   {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
                <select 
                    value={selectedYear} 
                    onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} 
                    className="bg-transparent text-zinc-300 text-xs font-medium py-1.5 px-2 cursor-pointer outline-none [&>option]:bg-zinc-900"
                >
                   <option value={-1}>Ano</option>
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
             </div>

             <button 
               onClick={() => setIsModalOpen(true)} 
               className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 shadow-md shadow-emerald-900/20 text-sm font-bold transition-all active:scale-95"
             >
               <Plus size={16}/> <span className="hidden sm:inline">Nova</span>
             </button>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={cardClass}>
                <div>
                    <p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                        {searchTerm ? 'Busca' : 'Total Selecionado'}
                    </p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(kpiData.totalSelected)}</h3>
                </div>
                <div className={iconBadgeClass}><DollarSign size={18} strokeWidth={2} /></div>
                <div className="mt-auto">
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded">
                        Receita Consolidada
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
                <div className={iconBadgeClass}><TrendingUp size={18}/></div>
            </div>

            <div className={cardClass}>
                <div>
                    <p className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Média Mensal</p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(kpiData.monthlyAverage)}</h3>
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-blue-400"><Wallet size={18}/></div>
            </div>
        </div>

        {/* TABELA DE DADOS */}
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-white">Histórico de Entradas</h3>
                    
                    {/* Botão de Excluir Selecionados (Aparece condicionalmente) */}
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                            <Trash2 size={14} /> Excluir {selectedIds.length}
                        </button>
                    )}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Buscar receita..." 
                        className="w-full rounded-lg border border-white/5 bg-zinc-900 py-1.5 pl-9 pr-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-zinc-600 transition-all"
                    />
                </div>
            </div>

            <div className="card overflow-hidden rounded-xl border border-white/5 p-0 flex flex-col h-[500px]">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                {/* CHECKBOX HEADER */}
                                <th className="px-6 py-3 w-10">
                                    <button onClick={handleSelectAll} className="text-zinc-500 hover:text-white transition-colors">
                                        {filteredIncomes.length > 0 && selectedIds.length === filteredIncomes.length ? (
                                            <SquareCheck size={16} className="text-emerald-500" />
                                        ) : (
                                            <Square size={16} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredIncomes.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-zinc-500 text-xs">Nenhuma receita encontrada.</td></tr>
                            ) : (
                                filteredIncomes.map((inc) => {
                                    const isSelected = selectedIds.includes(inc.id)
                                    return (
                                        <tr key={inc.id} className={`transition-colors group ${isSelected ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-white/5'}`}>
                                            {/* CHECKBOX ROW */}
                                            <td className="px-6 py-3">
                                                <button onClick={() => handleSelectOne(inc.id)} className="text-zinc-500 hover:text-white">
                                                    {isSelected ? <SquareCheck size={16} className="text-emerald-500" /> : <Square size={16} />}
                                                </button>
                                            </td>

                                            <td className="px-6 py-3 whitespace-nowrap text-xs text-zinc-300 font-medium">
                                                {editingId === inc.id ? (
                                                    <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-zinc-800 text-white border border-white/10 p-1 rounded w-full"/>
                                                ) : (
                                                    formatDate(inc.date)
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-white">
                                                <span className="inline-flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    {inc.description}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-xs font-bold text-emerald-400">
                                                {editingId === inc.id ? (
                                                    <input type="number" step="0.01" value={editValues.amount} onChange={(e) => setEditValues({...editValues, amount: e.target.value})} className="w-20 bg-zinc-800 border border-white/10 p-1 rounded font-bold"/>
                                                ) : (
                                                    `+ ${formatCurrency(inc.amount)}`
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right text-xs font-medium relative">
                                                {editingId === inc.id ? (
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => handleSaveEdit(inc.id)} className="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded"><Save size={14}/></button>
                                                        <button onClick={() => setEditingId(null)} className="text-red-400 hover:bg-red-500/10 p-1 rounded"><X size={14}/></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(inc.id)}} className="text-zinc-400 hover:text-white p-1 hover:bg-white/10 rounded"><MoreVertical size={14}/></button>
                                                        {openMenuId === inc.id && (
                                                            <div ref={menuRef} className="absolute right-8 top-0 z-50 w-28 bg-zinc-900 shadow-xl rounded-lg border border-white/10 overflow-hidden">
                                                                <button onClick={()=>handleStartEdit(inc)} className="w-full px-3 py-2 hover:bg-white/5 text-zinc-300 text-[10px] flex items-center gap-2"><Edit2 size={10}/> Editar</button>
                                                                <button onClick={()=>handleDelete(inc.id)} className="w-full px-3 py-2 hover:bg-red-500/10 text-red-400 text-[10px] flex items-center gap-2"><Trash2 size={10}/> Deletar</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* FOOTER BAR (NOVO) */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur border-t border-white/5 p-3 md:pl-64 z-40">
           <div className="mx-auto max-w-6xl flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <ListFilter size={14} />
                <span>Exibindo <strong className="text-zinc-300">{filteredIncomes.length}</strong> itens</span>
              </div>
              <div className="hidden sm:block">
                 {selectedYear === -1 ? 'Todos' : selectedYear}
              </div>
           </div>
        </div>

        {/* MODAL NOVA RECEITA */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 rounded-xl shadow-2xl p-6 border border-white/10 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><DollarSign size={18}/></div>
                  Nova Receita
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Descrição</label>
                  <input autoFocus required type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Ex: Salário..." className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none placeholder:text-zinc-600 text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Valor (R$)</label>
                    <input required type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none font-bold text-emerald-400 text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Data</label>
                    <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm"/>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-white/10 text-zinc-300 rounded-lg hover:bg-white/5 font-medium transition-colors text-sm">Cancelar</button>
                  <button type="submit" disabled={isLoadingSave} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2 transition-all active:scale-95 text-sm">{isLoadingSave ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}