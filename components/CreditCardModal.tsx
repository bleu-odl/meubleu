'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../lib/supabase'
import { X, Plus, Trash2, Tag, MoreVertical, Edit2, Save, Layers } from 'lucide-react'

const CATEGORIES = [
  { name: 'Alimentação', color: 'bg-orange-100 text-orange-800' },
  { name: 'Transporte', color: 'bg-blue-100 text-blue-800' },
  { name: 'Lazer', color: 'bg-purple-100 text-purple-800' },
  { name: 'Mercado', color: 'bg-green-100 text-green-800' },
  { name: 'Serviços', color: 'bg-gray-100 text-gray-800' },
  { name: 'Compras', color: 'bg-pink-100 text-pink-800' },
  { name: 'Saúde', color: 'bg-red-100 text-red-800' },
  { name: 'Outros', color: 'bg-slate-100 text-slate-800' },
]

interface CreditCardModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  expenseName: string
  onUpdateTotal: () => void
}

export default function CreditCardModal({ isOpen, onClose, expenseId, expenseName, onUpdateTotal }: CreditCardModalProps) {
  const [items, setItems] = useState<any[]>([])
  
  // Estados de Cadastro
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState(CATEGORIES[0].name)
  
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState('2')

  // Estados de Edição
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
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
      setItems(data)
      // Recalcula o total local baseado apenas nos itens DESTA fatura
      const sum = data.reduce((acc, curr) => acc + curr.amount, 0)
      setTotal(sum)
      
      // Garante que o valor da despesa pai esteja sincronizado no banco
      await supabase.from('expenses').update({ value: sum }).eq('id', expenseId)
      onUpdateTotal()
    }
    setLoading(false)
  }

  // --- CADASTRO INTELIGENTE (CORRIGIDO) ---
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!desc || !amount || !date) return

    const val = parseFloat(amount.replace(',', '.'))
    const numInstallments = isInstallment ? parseInt(installments) : 1
    
    // Pega o usuário atual para poder criar faturas novas se precisar
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    setLoading(true)

    try {
        // Loop para processar cada parcela
        for (let i = 0; i < numInstallments; i++) {
            // 1. Calcular a data da parcela (Mês base + i)
            const targetDate = new Date(date)
            targetDate.setMonth(targetDate.getMonth() + i)
            
            // Ajuste para evitar pular mês (ex: 31/01 -> 28/02)
            const originalDay = new Date(date).getDate()
            const maxDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate()
            targetDate.setDate(Math.min(originalDay, maxDay))

            const targetDateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

            // 2. Encontrar a FATURA CORRETA para esse mês
            // Procuramos uma despesa com o mesmo NOME e no mesmo MÊS/ANO
            const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString()
            const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).toISOString()

            const { data: existingExpense } = await supabase
                .from('expenses')
                .select('id, value')
                .eq('user_id', user.id)
                .eq('name', expenseName) // Procura pelo mesmo nome do cartão (ex: "Nubank")
                .gte('date', startOfMonth)
                .lte('date', endOfMonth)
                .single()

            let targetExpenseId = existingExpense?.id
            let currentExpenseValue = existingExpense?.value || 0

            // 3. Se não existir fatura para aquele mês futuro, cria ela agora!
            if (!targetExpenseId) {
                const { data: newExpense, error: createError } = await supabase
                    .from('expenses')
                    .insert({
                        user_id: user.id,
                        name: expenseName,
                        value: 0, // Começa com 0, vamos somar a parcela jájá
                        date: targetDateStr,
                        type: 'variavel', // Cartão tecnicamente é variável
                        status: 'pendente',
                        is_credit_card: true // IMPORTANTE: Marca como cartão
                    })
                    .select()
                    .single()
                
                if (createError) throw createError
                targetExpenseId = newExpense.id
            }

            // 4. Inserir a Transação na fatura certa
            const itemDesc = isInstallment ? `${desc} (${i + 1}/${numInstallments})` : desc
            
            const { error: transError } = await supabase.from('card_transactions').insert({
                expense_id: targetExpenseId,
                description: itemDesc,
                amount: val,
                category,
                created_at: targetDate.toISOString()
            })

            if (transError) throw transError

            // 5. Atualizar o valor total daquela fatura específica
            await supabase.from('expenses')
                .update({ value: currentExpenseValue + val })
                .eq('id', targetExpenseId)
        }

        // Sucesso! Limpa e recarrega
        setDesc('')
        setAmount('')
        setIsInstallment(false)
        setInstallments('2')
        
        // Recarrega os itens apenas da fatura ATUAL que estamos vendo
        fetchItems() 

    } catch (error: any) {
        alert('Erro ao processar parcelas: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  // --- EDIÇÃO E DELEÇÃO (Mantidos igual, pois operam no item específico) ---
  function handleStartEdit(item: any) {
    setEditingId(item.id)
    setEditValues({
      description: item.description,
      amount: item.amount.toString(),
      date: item.created_at.split('T')[0],
      category: item.category
    })
    setOpenMenuId(null)
  }

  function handleCancelEdit() { setEditingId(null) }

  async function handleSaveEdit(id: string) {
    const { error } = await supabase
      .from('card_transactions')
      .update({
        description: editValues.description,
        amount: parseFloat(editValues.amount),
        category: editValues.category,
        created_at: new Date(editValues.date).toISOString()
      })
      .eq('id', id)

    if (error) { alert("Erro: " + error.message) } else {
      fetchItems() // O fetchItems já recalcula o total
      setEditingId(null)
    }
  }

  async function handleDeleteItem(id: string, itemValue: number) {
    if (!confirm("Remover este gasto?")) return
    const { error } = await supabase.from('card_transactions').delete().eq('id', id)
    if (!error) {
      fetchItems() // O fetchItems já recalcula o total e remove o valor
    }
  }

  function handleToggleMenu(id: string) {
    if (openMenuId === id) setOpenMenuId(null); else setOpenMenuId(id)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{expenseName}</h2>
            <p className="text-sm text-gray-500">Gestão de gastos da fatura</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block uppercase font-semibold">Total desta Fatura</span>
            <span className="text-2xl font-bold text-gray-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Formulário */}
          <form onSubmit={handleAddItem} className="mb-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-blue-500" required />
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Descrição</label>
                <input autoFocus type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Lanche, Uber..." className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-blue-500" required />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Valor {isInstallment ? '(Parcela)' : ''}</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-blue-500" required />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-blue-500 bg-white">
                  {CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <button type="submit" disabled={loading} className="w-full h-[38px] flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50">
                    {loading ? <span className="animate-spin">⌛</span> : <Plus size={20}/>}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 border-t border-blue-100 pt-3">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsInstallment(!isInstallment)}>
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${isInstallment ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`}>
                        {isInstallment && <Plus size={10} className="text-white"/>}
                    </div>
                    <span className="text-sm text-gray-600 font-medium select-none flex items-center gap-1"><Layers size={14}/> Compra Parcelada?</span>
                </div>

                {isInstallment && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                        <span className="text-sm text-gray-500">Em</span>
                        <input type="number" min="2" max="24" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-16 rounded-md border-gray-300 p-1 text-sm text-center focus:ring-blue-500"/>
                        <span className="text-sm text-gray-500">vezes</span>
                    </div>
                )}
            </div>
          </form>

          {/* Lista de Gastos */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                <Tag className="mx-auto mb-2 opacity-20" size={40}/>
                Nenhum gasto lançado nesta fatura.
              </div>
            ) : (
              items.map(item => {
                const catStyle = CATEGORIES.find(c => c.name === item.category)?.color || 'bg-gray-100 text-gray-800'
                const displayDate = new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
                
                return (
                  <div key={item.id} className="relative group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-200 transition-colors shadow-sm">
                    {editingId === item.id ? (
                      <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                        <input type="date" value={editValues.date} onChange={e => setEditValues({...editValues, date: e.target.value})} className="col-span-3 border rounded p-1 text-sm"/>
                        <input type="text" value={editValues.description} onChange={e => setEditValues({...editValues, description: e.target.value})} className="col-span-4 border rounded p-1 text-sm"/>
                        <input type="number" step="0.01" value={editValues.amount} onChange={e => setEditValues({...editValues, amount: e.target.value})} className="col-span-2 border rounded p-1 text-sm font-bold text-blue-600"/>
                        <select value={editValues.category} onChange={e => setEditValues({...editValues, category: e.target.value})} className="col-span-2 border rounded p-1 text-sm">
                            {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                        <div className="col-span-1 flex gap-1">
                            <button onClick={() => handleSaveEdit(item.id)} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Save size={16}/></button>
                            <button onClick={handleCancelEdit} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><X size={16}/></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">{displayDate}</span>
                          <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wide ${catStyle}`}>{item.category}</span>
                          <span className="font-medium text-gray-700">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-gray-900">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <div className="relative">
                            <button onClick={() => handleToggleMenu(item.id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><MoreVertical size={16}/></button>
                            {openMenuId === item.id && (
                                <div ref={menuRef} className="absolute right-0 top-8 z-50 w-32 bg-white shadow-lg rounded-md border text-left animate-in fade-in zoom-in-95">
                                    <button onClick={() => handleStartEdit(item)} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit2 size={12}/> Editar</button>
                                    <button onClick={() => handleDeleteItem(item.id, item.amount)} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12}/> Excluir</button>
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
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
          <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}