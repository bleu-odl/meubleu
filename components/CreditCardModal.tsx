'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { X, Plus, Trash2, Tag, MoreVertical, Edit2, Save, Layers } from 'lucide-react'
import { CardTransaction } from '../lib/types'
import { formatCurrency, formatDate } from '../lib/utils'

const CATEGORIES = [
  { name: 'Alimentação', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { name: 'Transporte', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { name: 'Lazer', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { name: 'Mercado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { name: 'Serviços', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  { name: 'Compras', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { name: 'Saúde', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { name: 'Outros', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
]

interface CreditCardModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  expenseName: string
  onUpdateTotal: () => void
}

export default function CreditCardModal({ isOpen, onClose, expenseId, expenseName, onUpdateTotal }: CreditCardModalProps) {
  // Tipagem forte para itens da fatura
  const [items, setItems] = useState<CardTransaction[]>([])
  
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState(CATEGORIES[0].name)
  
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState('2')

  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ description: '', amount: '', date: '', category: '' })

  const supabase = createClient()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && expenseId) {
      fetchItems()
    }
  }, [isOpen, expenseId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: false })
    
    if (data) {
      setItems(data as CardTransaction[])
      const sum = data.reduce((acc, curr) => acc + curr.amount, 0)
      setTotal(sum)
      // Atualiza o valor total da despesa pai
      await supabase.from('expenses').update({ value: sum }).eq('id', expenseId)
      onUpdateTotal()
    }
    setLoading(false)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!desc || !amount || !date) return

    const inputVal = parseFloat(amount.replace(',', '.'))
    const numInstallments = isInstallment ? parseInt(installments) : 1
    const baseValue = Math.floor((inputVal / numInstallments) * 100) / 100
    const totalBase = baseValue * numInstallments
    const remainder = Number((inputVal - totalBase).toFixed(2))

    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    setLoading(true)

    try {
        const { data: currentInvoiceData, error: fetchError } = await supabase
            .from('expenses')
            .select('date, value')
            .eq('id', expenseId)
            .single()
        
        if (fetchError || !currentInvoiceData) throw new Error("Fatura atual não encontrada.")

        const baseInvoiceDate = new Date(currentInvoiceData.date)

        for (let i = 0; i < numInstallments; i++) {
            const transactionDate = new Date(date)
            transactionDate.setMonth(transactionDate.getMonth() + i)
            const maxDayTrans = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + 1, 0).getDate()
            transactionDate.setDate(Math.min(new Date(date).getDate(), maxDayTrans))

            let finalInstallmentValue = baseValue
            if (i === 0) {
                finalInstallmentValue = Number((baseValue + remainder).toFixed(2))
            }

            let targetExpenseId = ''
            let currentExpenseValue = 0

            if (i === 0) {
                targetExpenseId = expenseId
                currentExpenseValue = currentInvoiceData.value
            } else {
                const targetInvoiceDate = new Date(baseInvoiceDate)
                targetInvoiceDate.setMonth(baseInvoiceDate.getMonth() + i)

                const startOfMonth = new Date(targetInvoiceDate.getFullYear(), targetInvoiceDate.getMonth(), 1).toISOString()
                const endOfMonth = new Date(targetInvoiceDate.getFullYear(), targetInvoiceDate.getMonth() + 1, 0).toISOString()

                const { data: existingExpense } = await supabase
                    .from('expenses')
                    .select('id, value')
                    .eq('user_id', user.id)
                    .eq('name', expenseName) 
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
                    .maybeSingle()

                if (existingExpense) {
                    targetExpenseId = existingExpense.id
                    currentExpenseValue = existingExpense.value
                } else {
                    const { data: newExpense, error: createError } = await supabase
                        .from('expenses')
                        .insert({
                            user_id: user.id,
                            name: expenseName,
                            value: 0,
                            date: targetInvoiceDate.toISOString(),
                            type: 'variavel', 
                            status: 'pendente',
                            is_credit_card: true
                        })
                        .select()
                        .single()
                    
                    if (createError) throw createError
                    targetExpenseId = newExpense.id
                    currentExpenseValue = 0
                }
            }

            const itemDesc = isInstallment ? `${desc} (${i + 1}/${numInstallments})` : desc
            
            const { error: transError } = await supabase.from('card_transactions').insert({
                expense_id: targetExpenseId,
                description: itemDesc,
                amount: finalInstallmentValue,
                category,
                created_at: transactionDate.toISOString()
            })

            if (transError) throw transError

            await supabase.from('expenses')
                .update({ value: currentExpenseValue + finalInstallmentValue })
                .eq('id', targetExpenseId)
        }

        setDesc('')
        setAmount('')
        setIsInstallment(false)
        setInstallments('2')
        fetchItems() 

    } catch (error: any) {
        alert('Erro: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  function handleStartEdit(item: CardTransaction) {
    setEditingId(item.id)
    setEditValues({
      description: item.description,
      amount: item.amount.toString(),
      date: new Date(item.created_at).toISOString().split('T')[0],
      category: item.category
    })
    setOpenMenuId(null)
  }

  function handleCancelEdit() { setEditingId(null) }

  async function handleSaveEdit(id: string) {
    const { error } = await supabase.from('card_transactions').update({
        description: editValues.description,
        amount: parseFloat(editValues.amount),
        category: editValues.category,
        created_at: new Date(editValues.date).toISOString()
    }).eq('id', id)

    if (error) { alert("Erro: " + error.message) } else {
      // Recalcular total da despesa
      const { data: allItems } = await supabase.from('card_transactions').select('amount').eq('expense_id', expenseId)
      if (allItems) {
        const newTotal = allItems.reduce((acc, curr) => acc + curr.amount, 0)
        await supabase.from('expenses').update({ value: newTotal }).eq('id', expenseId)
        setTotal(newTotal)
        onUpdateTotal()
      }
      fetchItems()
      setEditingId(null)
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Remover este gasto?")) return
    const { error } = await supabase.from('card_transactions').delete().eq('id', id)
    if (!error) {
      fetchItems() 
    }
  }

  function handleToggleMenu(id: string) { if (openMenuId === id) setOpenMenuId(null); else setOpenMenuId(id) }
  
  let previewText = ''
  if (amount && isInstallment) {
    const val = parseFloat(amount.replace(',', '.'))
    const qtd = parseInt(installments)
    if (val > 0 && qtd > 0) {
        const base = Math.floor((val / qtd) * 100) / 100
        const totalBase = base * qtd
        const rest = Number((val - totalBase).toFixed(2))
        const first = Number((base + rest).toFixed(2))
        previewText = rest > 0 ? `1x ${first.toFixed(2)} + ${qtd - 1}x ${base.toFixed(2)}` : `${qtd}x de ${formatCurrency(base)}`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">{expenseName}</h2>
            <p className="text-sm text-zinc-400">Gestão de gastos da fatura</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-500 block uppercase font-bold tracking-wider">Total</span>
            <span className="text-2xl font-bold text-white">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          <form onSubmit={handleAddItem} className="mb-8 bg-zinc-800/50 p-4 rounded-xl border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border-white/10 bg-zinc-950 p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none" required />
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Descrição</label>
                <input autoFocus type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Lanche..." className="w-full rounded-lg border-white/10 bg-zinc-950 p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-zinc-600" required />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">{isInstallment ? 'Total' : 'Valor'}</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full rounded-lg border-white/10 bg-zinc-950 p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-zinc-600" required />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-lg border-white/10 bg-zinc-950 p-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                  {CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <button type="submit" disabled={loading} className="w-full h-[42px] flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 active:scale-95">
                    {loading ? <span className="animate-spin">⌛</span> : <Plus size={20}/>}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-4">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsInstallment(!isInstallment)}>
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${isInstallment ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600 bg-transparent group-hover:border-zinc-400'}`}>
                        {isInstallment && <Plus size={10} className="text-white"/>}
                    </div>
                    <span className={`text-sm font-medium select-none flex items-center gap-1 ${isInstallment ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}><Layers size={14}/> Parcelar?</span>
                </div>

                {isInstallment && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                        <span className="text-sm text-zinc-500">Em</span>
                        <input type="number" min="2" max="48" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-14 rounded-md border-white/10 bg-zinc-950 p-1 text-sm text-center text-white focus:ring-indigo-500 outline-none"/>
                        <span className="text-sm text-zinc-500">x</span>
                    </div>
                )}
            </div>
            
            {isInstallment && amount && (
                <div className="mt-3 text-xs text-indigo-300 font-medium animate-in fade-in bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                    Resumo: <span className="font-bold text-indigo-200">{previewText}</span>
                </div>
            )}
          </form>

          <div className="space-y-2 pb-10">
            {items.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                <Tag className="mx-auto mb-3 opacity-20" size={40}/>
                Nenhum gasto nesta fatura.
              </div>
            ) : (
              items.map(item => {
                const catInfo = CATEGORIES.find(c => c.name === item.category)
                const catStyle = catInfo?.color || 'bg-zinc-800 text-zinc-400 border-white/5'
                
                return (
                  <div key={item.id} className="relative group flex items-center justify-between p-3 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 hover:bg-zinc-800/50 transition-all shadow-sm">
                    {editingId === item.id ? (
                      <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                        <input type="date" value={editValues.date} onChange={e => setEditValues({...editValues, date: e.target.value})} className="col-span-3 bg-zinc-950 border border-white/10 rounded p-1.5 text-xs text-white"/>
                        <input type="text" value={editValues.description} onChange={e => setEditValues({...editValues, description: e.target.value})} className="col-span-4 bg-zinc-950 border border-white/10 rounded p-1.5 text-xs text-white"/>
                        <input type="number" step="0.01" value={editValues.amount} onChange={e => setEditValues({...editValues, amount: e.target.value})} className="col-span-2 bg-zinc-950 border border-white/10 rounded p-1.5 text-xs font-bold text-indigo-400"/>
                        <select value={editValues.category} onChange={e => setEditValues({...editValues, category: e.target.value})} className="col-span-2 bg-zinc-950 border border-white/10 rounded p-1.5 text-xs text-white">
                            {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                        <div className="col-span-1 flex gap-1 justify-end">
                            <button onClick={() => handleSaveEdit(item.id)} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20"><Save size={14}/></button>
                            <button onClick={handleCancelEdit} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"><X size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-zinc-500 bg-zinc-950 border border-white/5 px-2 py-1 rounded-md">{formatDate(item.created_at)}</span>
                          <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wide border ${catStyle}`}>{item.category}</span>
                          <span className="font-medium text-zinc-300">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-white">{formatCurrency(item.amount)}</span>
                          <div className="relative">
                            <button onClick={() => handleToggleMenu(item.id)} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><MoreVertical size={16}/></button>
                            {openMenuId === item.id && (
                                <div ref={menuRef} className="absolute right-0 top-8 z-50 w-32 bg-zinc-900 shadow-xl rounded-lg border border-white/10 text-left animate-in fade-in zoom-in-95 overflow-hidden">
                                    <button onClick={() => handleStartEdit(item)} className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white flex items-center gap-2"><Edit2 size={12}/> Editar</button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={12}/> Excluir</button>
                                </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>

        </div>
        <div className="p-4 border-t border-white/5 bg-zinc-900/50 flex justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2 bg-zinc-800 border border-white/5 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700 hover:text-white transition-colors text-sm">Fechar</button>
        </div>
      </div>
    </div>
  )
}