'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search, DollarSign, X, Save, MoreVertical, Edit2 } from 'lucide-react'

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')

  // Modal e Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ description: '', amount: '', date: '' })
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  
  // Controle de Menu e Edição em Linha
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ date: '', amount: '' })

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

    let query = supabase.from('incomes').select('*').eq('user_id', user.id)

    if (selectedMonth !== -1) {
      const yearStr = selectedYear
      const monthStr = String(selectedMonth + 1).padStart(2, '0') 
      const startDate = `${yearStr}-${monthStr}-01`
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
      const endDate = `${yearStr}-${monthStr}-${lastDay}`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query.order('date', { ascending: true })

    if (error) console.error(error)
    else setIncomes(data || [])
    
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
      setIncomes(prev => prev.map(inc => 
        inc.id === id 
          ? { ...inc, date: editValues.date, amount: parseFloat(editValues.amount) } 
          : inc
      ))
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
    setIncomes(prev => prev.filter(inc => inc.id !== id))
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if(error) fetchIncomes()
  }

  const filteredIncomes = incomes.filter(inc => 
    inc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0)

  // Design Token: Pílula Verde Neon suave para Dark Mode
  const pillClass = "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-5xl">
        
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Receitas</h1>
            <p className="text-slate-400">Controle suas entradas de dinheiro</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 font-medium transition-colors"
          >
            <Plus size={20}/> Nova Entrada
          </button>
        </div>

        {/* FILTROS DARK */}
        <div className="card mb-6 p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><Search size={12}/> Buscar</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder="Ex: Salário, Freela..." 
                    className="w-full rounded-lg border-white/10 bg-[#181924] py-2 pl-9 pr-3 text-sm text-white focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-600"
                />
            </div>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block mx-2"></div>
          <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Período</label>
              <div className="flex gap-2">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="rounded-lg border-white/10 py-2 px-3 text-sm bg-[#181924] text-white focus:ring-emerald-500">
                      <option value={-1}>Todo o Período</option>
                      {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="rounded-lg border-white/10 py-2 px-3 text-sm bg-[#181924] text-white focus:ring-emerald-500 disabled:opacity-50" disabled={selectedMonth === -1}>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
              </div>
          </div>
        </div>

        {/* TABELA DARK */}
        <div className="card overflow-hidden rounded-2xl min-h-[300px]">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando...</td></tr>
              ) : filteredIncomes.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-slate-500">Nenhuma receita encontrada.</td></tr>
              ) : (
                filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-white/5 transition-colors relative group">
                    
                    {/* DATA */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">
                      {editingId === inc.id ? (
                        <input 
                          type="date" 
                          value={editValues.date}
                          onChange={(e) => setEditValues({...editValues, date: e.target.value})}
                          className="bg-[#181924] text-white border border-white/10 p-1 rounded w-full text-sm"
                        />
                      ) : (
                        new Date(inc.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                      )}
                    </td>

                    {/* DESCRIÇÃO */}
                    <td className="px-6 py-4 text-sm text-white">
                      <span className={pillClass}>
                        {inc.description}
                      </span>
                    </td>

                    {/* VALOR */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400">
                      {editingId === inc.id ? (
                        <div className="flex items-center">
                            <span className="mr-1 text-slate-500">R$</span>
                            <input 
                            type="number" 
                            step="0.01"
                            value={editValues.amount}
                            onChange={(e) => setEditValues({...editValues, amount: e.target.value})}
                            className="w-24 bg-[#181924] border border-white/10 p-1 rounded text-sm text-emerald-400 font-bold"
                            />
                        </div>
                      ) : (
                        `+ R$ ${inc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      )}
                    </td>

                    {/* MENU */}
                    <td className="px-6 py-4 text-right text-sm font-medium relative">
                      {editingId === inc.id ? (
                        <div className="flex justify-end gap-2">
                           <button onClick={() => handleSaveEdit(inc.id)} className="text-emerald-400 hover:text-emerald-300 p-1 rounded"><Save size={18}/></button>
                           <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 p-1 rounded"><X size={18}/></button>
                        </div>
                      ) : (
                        <>
                           <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(inc.id)}} className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                             <MoreVertical size={18}/>
                           </button>
                           
                           {openMenuId === inc.id && (
                             <div ref={menuRef} className="absolute right-8 top-8 z-50 w-40 bg-[#1E1F2B] shadow-xl rounded-xl border border-white/10 text-left overflow-hidden">
                                 <button onClick={() => handleStartEdit(inc)} className="w-full px-4 py-2.5 hover:bg-white/5 text-slate-300 text-sm flex items-center gap-2 transition-colors">
                                   <Edit2 size={14}/> Editar
                                 </button>
                                 <button onClick={() => handleDelete(inc.id)} className="w-full px-4 py-2.5 hover:bg-red-500/10 text-red-400 text-sm flex items-center gap-2 transition-colors">
                                   <Trash2 size={14}/> Excluir
                                 </button>
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

        {/* RODAPÉ TOTAL */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#1E1F2B] border-t border-white/5 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] md:pl-64 z-40">
           <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total de Receitas</span>
                <span className="text-[10px] text-slate-600 font-medium">Exibindo {filteredIncomes.length} entradas</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
           </div>
        </div>

        {/* MODAL DARK */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#23242f] rounded-2xl shadow-2xl p-6 border border-white/10 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400"><DollarSign size={20}/></div>
                  Nova Receita
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Referente a que?</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Ex: Salário, Venda de Férias..."
                    className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Valor (R$)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Data</label>
                    <input 
                      required
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-white/10 text-slate-300 rounded-xl hover:bg-white/5 font-medium transition-colors">Cancelar</button>
                  <button type="submit" disabled={isLoadingSave} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2 transition-all active:scale-95">
                    {isLoadingSave ? 'Salvando...' : <><Save size={18}/> Salvar</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}