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

  // Fecha menu ao clicar fora
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
      // Atualiza localmente
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
    
    // Atualiza visualmente primeiro
    setIncomes(prev => prev.filter(inc => inc.id !== id))
    
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if(error) {
        alert("Erro ao deletar: " + error.message)
        fetchIncomes() // Reverte se der erro
    }
  }

  const filteredIncomes = incomes.filter(inc => 
    inc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0)

  const pillClass = "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-100"

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-5xl">
        
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Receitas</h1>
            <p className="text-gray-500">Controle suas entradas de dinheiro</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 shadow-md font-medium transition-colors"
          >
            <Plus size={20}/> Nova Entrada
          </button>
        </div>

        {/* FILTROS */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1"><Search size={12}/> Buscar</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ex: Salário, Freela..." className="w-full rounded-md border-gray-300 py-1.5 pl-9 pr-3 text-sm bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500"/>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 hidden sm:block mx-2"></div>
          <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Período</label>
              <div className="flex gap-2">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="rounded-md border-gray-300 py-1.5 text-sm bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500">
                      <option value={-1}>Todo o Período</option>
                      {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="rounded-md border-gray-300 py-1.5 text-sm bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50" disabled={selectedMonth === -1}>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
              </div>
          </div>
        </div>

        {/* TABELA */}
        <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-100 min-h-[300px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Valor</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando...</td></tr>
              ) : filteredIncomes.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-gray-500">Nenhuma receita encontrada.</td></tr>
              ) : (
                filteredIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 transition-colors relative group">
                    
                    {/* DATA (Editável) */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {editingId === inc.id ? (
                        <input 
                          type="date" 
                          value={editValues.date}
                          onChange={(e) => setEditValues({...editValues, date: e.target.value})}
                          className="border p-1 rounded w-full text-sm"
                        />
                      ) : (
                        new Date(inc.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                      )}
                    </td>

                    {/* DESCRIÇÃO (Fixo) */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className={pillClass}>
                        {inc.description}
                      </span>
                    </td>

                    {/* VALOR (Editável) */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                      {editingId === inc.id ? (
                        <div className="flex items-center">
                            <span className="mr-1 text-gray-500">R$</span>
                            <input 
                            type="number" 
                            step="0.01"
                            value={editValues.amount}
                            onChange={(e) => setEditValues({...editValues, amount: e.target.value})}
                            className="w-24 border p-1 rounded text-sm text-emerald-700 font-bold"
                            />
                        </div>
                      ) : (
                        `+ R$ ${inc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      )}
                    </td>

                    {/* MENU DE AÇÕES (3 PONTINHOS) */}
                    <td className="px-6 py-4 text-right text-sm font-medium relative">
                      {editingId === inc.id ? (
                        <div className="flex justify-end gap-2">
                           <button onClick={() => handleSaveEdit(inc.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={18}/></button>
                           <button onClick={handleCancelEdit} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={18}/></button>
                        </div>
                      ) : (
                        <>
                           <button onClick={(e)=>{e.stopPropagation(); handleToggleMenu(inc.id)}} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                             <MoreVertical size={20}/>
                           </button>
                           
                           {openMenuId === inc.id && (
                             <div ref={menuRef} className="absolute right-8 top-8 z-50 w-40 bg-white shadow-lg rounded-md border text-left ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100">
                               <div className="py-1">
                                 <button onClick={() => handleStartEdit(inc)} className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 gap-2">
                                   <Edit2 size={14}/> Editar
                                 </button>
                                 <button onClick={() => handleDelete(inc.id)} className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 gap-2">
                                   <Trash2 size={14}/> Excluir
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

        {/* RODAPÉ TOTAL */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:pl-64 z-40">
           <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wider block mb-1">Total de Receitas</span>
                <span className="text-xs text-gray-500 font-medium">Exibindo {filteredIncomes.length} entradas</span>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600">
                R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
           </div>
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-full text-emerald-600"><DollarSign size={20}/></div>
                  Nova Receita
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Referente a que?</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Ex: Salário, Venda de Férias..."
                    className="w-full rounded-lg border-gray-300 p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="0.00"
                      className="w-full rounded-lg border-gray-300 p-2.5 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                    <input 
                      required
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full rounded-lg border-gray-300 p-2.5 focus:ring-emerald-500 focus:border-emerald-500 text-gray-600"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
                  <button type="submit" disabled={isLoadingSave} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm flex justify-center items-center gap-2">
                    {isLoadingSave ? 'Salvando...' : <><Save size={18}/> Salvar Entrada</>}
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