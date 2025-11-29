'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { X, Plus, Trash2, Tag, Calendar } from 'lucide-react'

// Categorias Estilo Notion
const CATEGORIES = [
  { name: 'Alimentação', color: 'bg-orange-100 text-orange-800' },
  { name: 'Transporte', color: 'bg-blue-100 text-blue-800' },
  { name: 'Lazer', color: 'bg-purple-100 text-purple-800' },
  { name: 'Mercado', color: 'bg-green-100 text-green-800' },
  { name: 'Serviços', color: 'bg-gray-100 text-gray-800' },
  { name: 'Compras', color: 'bg-pink-100 text-pink-800' },
  { name: 'Saúde', color: 'bg-red-100 text-red-800' },
]

interface CreditCardModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  expenseName: string
  onUpdateTotal: () => void // Função para avisar a tela principal que o valor mudou
}

export default function CreditCardModal({ isOpen, onClose, expenseId, expenseName, onUpdateTotal }: CreditCardModalProps) {
  const [items, setItems] = useState<any[]>([])
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen && expenseId) {
      fetchItems()
    }
  }, [isOpen, expenseId])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: false })
    
    if (data) {
      setItems(data)
      const sum = data.reduce((acc, curr) => acc + curr.amount, 0)
      setTotal(sum)
    }
    setLoading(false)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!desc || !amount) return

    const val = parseFloat(amount.replace(',', '.'))

    // 1. Adiciona o item
    const { error } = await supabase.from('card_transactions').insert({
      expense_id: expenseId,
      description: desc,
      amount: val,
      category
    })

    if (!error) {
      // 2. Atualiza o valor TOTAL da fatura principal
      const newTotal = total + val
      await supabase.from('expenses').update({ value: newTotal }).eq('id', expenseId)
      
      setDesc('')
      setAmount('')
      fetchItems() // Recarrega lista
      onUpdateTotal() // Avisa a tela de trás
    }
  }

  async function handleDeleteItem(id: string, itemValue: number) {
    const { error } = await supabase.from('card_transactions').delete().eq('id', id)
    if (!error) {
      // Atualiza o total removendo o valor
      const newTotal = total - itemValue
      await supabase.from('expenses').update({ value: newTotal }).eq('id', expenseId)
      
      fetchItems()
      onUpdateTotal()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{expenseName}</h2>
            <p className="text-sm text-gray-500">Gestão da Fatura</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block uppercase">Total da Fatura</span>
            <span className="text-2xl font-bold text-gray-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Corpo (Scrollável) */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Formulário Ágil */}
          <form onSubmit={handleAddItem} className="mb-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Descrição</label>
                <input 
                  autoFocus
                  type="text" 
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Ex: Lanche, Uber..." 
                  className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-blue-500"
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Valor</label>
                <input 
                  type="number" step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" 
                  className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Categoria</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-blue-500 bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <button type="submit" className="w-full h-[38px] flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
                  <Plus size={20}/>
                </button>
              </div>
            </div>
          </form>

          {/* Lista de Gastos */}
          <div className="space-y-2">
            {loading ? <p className="text-center text-gray-400">Carregando...</p> : items.length === 0 ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                <Tag className="mx-auto mb-2 opacity-20" size={40}/>
                Nenhum gasto lançado nesta fatura.
              </div>
            ) : (
              items.map(item => {
                const catStyle = CATEGORIES.find(c => c.name === item.category)?.color || 'bg-gray-100 text-gray-800'
                
                return (
                  <div key={item.id} className="group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-200 transition-colors shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wide ${catStyle}`}>
                        {item.category}
                      </span>
                      <span className="font-medium text-gray-700">{item.description}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button 
                        onClick={() => handleDeleteItem(item.id, item.amount)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
          <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100">
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}