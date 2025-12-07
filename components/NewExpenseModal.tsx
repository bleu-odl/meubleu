'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { X } from 'lucide-react'

interface NewExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (expense: any) => void
}

export default function NewExpenseModal({ isOpen, onClose, onSave }: NewExpenseModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('variavel') 
  const [recurrence, setRecurrence] = useState('') 
  const [isFixedValue, setIsFixedValue] = useState(false)
  const [isCreditCard, setIsCreditCard] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [availableAccounts, setAvailableAccounts] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchAccounts()
    }
  }, [isOpen])

  async function fetchAccounts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('name')
    setAvailableAccounts(data || [])
  }

  function handleAccountChange(accountName: string) {
    setName(accountName)
    const account = availableAccounts.find(a => a.name === accountName)
    if (account) {
      setIsCreditCard(account.is_credit_card)
    }
  }

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return alert("Selecione uma conta!")

    setIsLoading(true)
    
    const newExpense = {
      name,
      value: parseFloat(amount.replace(',', '.')),
      date,
      type, 
      status: 'pendente',
      recurrence_months: type === 'fixa' ? parseInt(recurrence) : null,
      is_fixed_value: type === 'fixa' ? isFixedValue : false,
      is_credit_card: isCreditCard
    }

    await onSave(newExpense)
    
    setName('')
    setAmount('')
    setDate('')
    setType('variavel')
    setRecurrence('')
    setIsFixedValue(false)
    setIsCreditCard(false)
    setIsLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl p-6 border border-white/10 animate-in fade-in zoom-in-95">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Novo Lançamento</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="flex rounded-lg bg-zinc-950 p-1 border border-white/5">
            <button type="button" onClick={() => setType('variavel')} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${type === 'variavel' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Variável</button>
            <button type="button" onClick={() => setType('fixa')} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${type === 'fixa' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Fixa</button>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Conta / Descrição</label>
            <select
              required
              value={name}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="">Selecione uma conta...</option>
              {availableAccounts.map(acc => (
                <option key={acc.id} value={acc.name}>
                  {acc.name}
                </option>
              ))}
            </select>
            {availableAccounts.length === 0 && (
                <p className="text-xs text-rose-400 mt-2">Nenhuma conta cadastrada. Vá em "Minhas Despesas".</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Valor (R$)</label>
            <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold placeholder:font-normal placeholder:text-zinc-600" placeholder="0.00"/>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">{type === 'fixa' ? 'Vencimento (1ª Parcela)' : 'Vencimento'}</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
          </div>

          {type === 'fixa' && (
            <div className="rounded-xl bg-blue-500/10 p-4 space-y-3 border border-blue-500/20 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-bold text-blue-300 mb-1.5 uppercase">Repetir (Meses)</label>
                <input required type="number" min="2" max="60" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="w-full rounded-lg border border-blue-500/30 bg-black/20 p-2 text-sm text-white focus:ring-1 focus:ring-blue-400 outline-none"/>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="fixedValue" checked={isFixedValue} onChange={(e) => setIsFixedValue(e.target.checked)} className="h-4 w-4 rounded border-blue-500/50 bg-black/20 text-blue-500 focus:ring-blue-500"/>
                <label htmlFor="fixedValue" className="text-sm text-blue-200 cursor-pointer select-none">Valor é fixo?</label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-3 border border-white/10 text-zinc-300 rounded-xl hover:bg-white/5 font-medium transition-colors text-sm">Cancelar</button>
            <button type="submit" disabled={isLoading} className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-sm disabled:opacity-50">{isLoading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}