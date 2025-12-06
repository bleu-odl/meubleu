'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Trash2, Search, DollarSign, X, Save, MoreVertical, Edit2, 
  TrendingUp, Calendar, Wallet, ListFilter 
} from 'lucide-react'

// --- CONSTANTES E ESTILOS ---
// Mantendo a consistência com a página de Expenses, mas usando tema Emerald (Verde)
const cardClass = "card relative p-5 flex flex-col justify-between h-32 md:h-40"
const iconBadgeClass = "absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-emerald-400"

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  // Inicializa o Ano com o atual, mas permite selecionar "Todos" (-1)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')

  // Modal e Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ description: '', amount: '', date: '' })
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  
  // Controle de Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', amount: '' })

  // Dados para KPIs
  const [totalYear, setTotalYear] = useState(0)
  const [monthlyAverage, setMonthlyAverage] = useState(0)

  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

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
    fetchIncomes()
  }, [selectedMonth, selectedYear])

  async function fetchIncomes() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // --- 1. BUSCAR DADOS DA LISTA (Com Filtros de Data) ---
    let query = supabase.from('incomes').select('*').eq('user_id', user.id)

    // Lógica de Filtro de Data (Idêntica à de Expenses)
    if (selectedYear !== -1) {
        const yearStr = selectedYear
        
        if (selectedMonth !== -1) {
            // Mês específico
            const monthStr = String(selectedMonth + 1).padStart(2, '0') 
            const startDate = `${yearStr}-${monthStr}-01`
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
            const endDate = `${yearStr}-${monthStr}-${lastDay}`
            query = query.gte('date', startDate).lte('date', endDate)
        } else {
            // Ano todo
            query = query.gte('date', `${yearStr}-01-01`).lte('date', `${yearStr}-12-31`)
        }
    }
    // Se selectedYear === -1, traz tudo

    const { data: listData, error } = await query.order('date', { ascending: true })
    if (error) console.error(error)
    else setIncomes(listData || [])

    // --- 2. DADOS ANUAIS PARA KPIS ---
    // Se "Todos" estiver selecionado, usamos o ano atual como base para os KPIs de contexto anual,
    // ou poderíamos calcular sobre todo o histórico. Aqui mantive a lógica de mostrar o contexto do ano atual/selecionado.
    const kpiYear = selectedYear === -1 ? new Date().getFullYear() : selectedYear
    const startYear = `${kpiYear}-01-01`
    const endYear = `${kpiYear}-12-31`
    
    const { data: yearData } = await supabase
      .from('incomes')
      .select('amount')
      .eq('user_id', user.id)
      .gte('date', startYear)
      .lte('date', endYear)

    if (yearData) {
      const totalY = yearData.reduce((acc, curr) => acc + curr.amount, 0)
      setTotalYear(totalY)
      
      // Média baseada nos meses que já passaram ou têm dados
      const currentMonthIndex = new Date().getFullYear() === kpiYear ? new Date().getMonth() + 1 : 12
      setMonthlyAverage(totalY / currentMonthIndex)
    }
    
    setLoading(false)
  }

  // --- AÇÕES DO CRUD ---

  function handleToggleMenu(id: string) {
    if (openMenuId === id) setOpenMenuId(null); else setOpenMenuId(id)
  }

  function handleStartEdit(income: any) {
    setEditingId(income.id)
    setEditValues({ 
      date: income.date.split('T')[0], 
      amount: income.amount.toString() 
    })
    setOpenMenuId(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditValues({ date: '', amount: '' })
  }

  async function handleSaveEdit(id: string) {
    const { error } = await supabase
      .from('incomes')
      .update({ 
        date: editValues.date, 
        amount: parseFloat(editValues.amount) 
      })
      .eq('id', id)

    if (error) {
      alert("Erro ao salvar: " + error.message)
    } else {
      fetchIncomes()
      setEditingId(null)
    }
  }

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
      alert('Erro ao salvar: ' + error.message)
    } else {
      setFormData({ description: '', amount: '', date: '' })
      setIsModalOpen(false)
      fetchIncomes()
    }
    setIsLoadingSave(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja apagar esta entrada?')) return
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if(!error) fetchIncomes()
  }

  const filteredIncomes = incomes.filter(inc => 
    inc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* CABEÇALHO E FILTROS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-white tracking-tight">Receitas</h1>
            <p className="text-slate-400 mt-1">Gerencie suas fontes de renda</p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Filtro de Data */}
             <div className="card flex items-center p-1.5 rounded-xl h-fit">
                <div className="flex items-center gap-2 px-3 border-r border-white/10">
                   <Calendar size={16} className="text-emerald-400"/>
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

             <button 
               onClick={() => setIsModalOpen(true)} 
               className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 font-bold transition-all active:scale-95"
             >
               <Plus size={20}/> <span className="hidden sm:inline">Nova Receita</span>
             </button>
          </div>
        </div>

        {/* KPIs (GRID HORIZONTAL 3 COLUNAS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI 1: Total do Período */}
            <div className={cardClass}>
                <div>
                    <p className="text-[13px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        {searchTerm ? 'Total da Busca' : 'Total Selecionado'}
                    </p>
                    <h3 className="text-[32px] font-bold text-white tracking-tight">R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className={iconBadgeClass}><DollarSign size={20} strokeWidth={2.5} /></div>
                <div className="mt-auto">
                    <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
                        Receita Consolidada
                    </span>
                </div>
            </div>

            {/* KPI 2: Acumulado Anual */}
            <div className={cardClass}>
                <div>
                    <p className="text-[13px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        Acumulado {selectedYear === -1 ? new Date().getFullYear() : selectedYear}
                    </p>
                    <h3 className="text-[28px] font-bold text-white tracking-tight">R$ {totalYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className={iconBadgeClass}><TrendingUp size={20}/></div>
            </div>

            {/* KPI 3: Média Mensal */}
            <div className={cardClass}>
                <div>
                    <p className="text-[13px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Média Mensal</p>
                    <h3 className="text-[28px] font-bold text-white tracking-tight">R$ {monthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-blue-400"><Wallet size={20}/></div>
            </div>
        </div>

        {/* LISTA DE LANÇAMENTOS (TABELA COM SCROLL) */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Histórico de Entradas</h3>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Buscar receita..." 
                        className="w-full rounded-lg border border-white/5 bg-[#1E1F2B] py-2 pl-9 pr-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-600 transition-all"
                    />
                </div>
            </div>

            {/* CONTAINER DA TABELA (Altura Fixa + Scroll Sticky) */}
            <div className="card overflow-hidden rounded-xl border border-white/5 p-0 flex flex-col h-[500px]">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-[#1E1F2B] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Data</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Descrição</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Valor</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#1E1F2B]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-sm">Carregando dados...</td></tr>
                            ) : filteredIncomes.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 text-center text-slate-500 text-sm">Nenhuma receita encontrada neste período.</td></tr>
                            ) : (
                                filteredIncomes.map((inc) => (
                                    <tr key={inc.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">
                                            {editingId === inc.id ? (
                                                <input type="date" value={editValues.date} onChange={(e) => setEditValues({...editValues, date: e.target.value})} className="bg-[#13141c] text-white border border-white/20 p-1 rounded w-full text-xs"/>
                                            ) : (
                                                new Date(inc.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white">
                                            <span className="inline-flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                {inc.description}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400">
                                            {editingId === inc.id ? (
                                                <input type="number" step="0.01" value={editValues.amount} onChange={(e) => setEditValues({...editValues, amount: e.target.value})} className="w-24 bg-[#13141c] border border-white/20 p-1 rounded text-xs text-emerald-400 font-bold"/>
                                            ) : (
                                                `+ R$ ${inc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium relative">
                                            {editingId === inc.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleSaveEdit(inc.id)} className="text-emerald-400 hover:text-emerald-300 p-1.5 bg-emerald-500/10 rounded-md transition-colors"><Save size={16}/></button>
                                                    <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 p-1.5 bg-red-500/10 rounded-md transition-colors"><X size={16}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(inc.id)}} className="text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-md transition-colors"><MoreVertical size={16}/></button>
                                                    {openMenuId === inc.id && (
                                                        <div ref={menuRef} className="absolute right-8 top-0 z-50 w-32 bg-[#1E1F2B] shadow-xl rounded-xl border border-white/10 text-left overflow-hidden">
                                                            <button onClick={()=>handleStartEdit(inc)} className="w-full px-4 py-2 hover:bg-white/5 text-slate-300 text-xs flex items-center gap-2 transition-colors"><Edit2 size={12}/> Editar</button>
                                                            <button onClick={()=>handleDelete(inc.id)} className="w-full px-4 py-2 hover:bg-red-500/10 text-red-400 text-xs flex items-center gap-2 transition-colors"><Trash2 size={12}/> Deletar</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* RODAPÉ FIXO INFORMATIVO */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#1E1F2B] border-t border-white/5 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] md:pl-64 z-40 transition-all">
           <div className="mx-auto max-w-6xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <ListFilter size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                    Exibindo <strong className="text-white">{filteredIncomes.length}</strong> entradas
                </span>
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">
                 Filtro: {selectedYear === -1 ? 'Todo o Histórico' : (selectedMonth === -1 ? `Ano de ${selectedYear}` : `${months[selectedMonth]} de ${selectedYear}`)}
              </div>
           </div>
        </div>

        {/* MODAL DARK */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#23242f] rounded-2xl shadow-2xl p-6 border border-white/10 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><DollarSign size={20}/></div>
                  Nova Receita
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Descrição</label>
                  <input autoFocus required type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Ex: Salário, Freela..." className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none placeholder:text-slate-600"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Valor (R$)</label>
                    <input required type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none font-bold text-emerald-400"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Data</label>
                    <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none"/>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-white/10 text-slate-300 rounded-xl hover:bg-white/5 font-medium transition-colors">Cancelar</button>
                  <button type="submit" disabled={isLoadingSave} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2 transition-all active:scale-95">{isLoadingSave ? 'Salvando...' : <><Save size={18}/> Salvar</>}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}