'use client'

import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { createClient } from '../lib/supabase' // Importamos para buscar as contas

interface NewExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (expense: any) => void
}

export default function NewExpenseModal({ isOpen, onClose, onSave }: NewExpenseModalProps) {
  // ESTADOS DO FORMULÁRIO
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('variavel') 
  const [recurrence, setRecurrence] = useState('') 
  const [isFixedValue, setIsFixedValue] = useState(false)
  const [isCreditCard, setIsCreditCard] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // ESTADO PARA A LISTA DE CONTAS (DO BANCO)
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([])
  const supabase = createClient()

  // Busca as contas cadastradas quando o modal abre
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

  // Quando escolhe uma conta na lista, verifica se ela é cartão automaticamente
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
      name, // Aqui vai o nome selecionado na lista
      value: parseFloat(amount.replace(',', '.')),
      date,
      type, 
      status: 'pendente',
      recurrence_months: type === 'fixa' ? parseInt(recurrence) : null,
      is_fixed_value: type === 'fixa' ? isFixedValue : false,
      is_credit_card: isCreditCard
    }

    await onSave(newExpense)
    
    // Reset
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Novo Lançamento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex rounded-md bg-gray-100 p-1">
            <button type="button" onClick={() => setType('variavel')} className={`flex-1 rounded-md py-1 text-sm font-medium transition-all ${type === 'variavel' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Variável</button>
            <button type="button" onClick={() => setType('fixa')} className={`flex-1 rounded-md py-1 text-sm font-medium transition-all ${type === 'fixa' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Fixa</button>
          </div>

          {/* LISTA SUSPENSA DE CONTAS */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Conta / Descrição</label>
            <select
              required
              value={name}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma conta...</option>
              {availableAccounts.map(acc => (
                <option key={acc.id} value={acc.name}>
                  {acc.name} {acc.is_credit_card ? '(Cartão)' : ''}
                </option>
              ))}
            </select>
            {availableAccounts.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Nenhuma conta cadastrada. Vá em "Minhas Contas" primeiro.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
            <input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500" placeholder="0.00"/>
          </div>

          {/* Checkbox automático (mas o usuário pode mudar se quiser) */}
          <div className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${isCreditCard ? 'bg-purple-50 border-purple-200' : 'border-gray-200'}`} onClick={() => setIsCreditCard(!isCreditCard)}>
            <div className={`rounded-full p-1 ${isCreditCard ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}><CreditCard size={18} /></div>
            <div className="flex-1">
              <span className={`text-sm font-medium ${isCreditCard ? 'text-purple-900' : 'text-gray-700'}`}>É fatura de cartão?</span>
            </div>
            <input type="checkbox" checked={isCreditCard} onChange={(e) => setIsCreditCard(e.target.checked)} className="h-4 w-4 rounded text-purple-600 pointer-events-none"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">{type === 'fixa' ? 'Vencimento (1ª Parcela)' : 'Vencimento'}</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500"/>
          </div>

          {type === 'fixa' && (
            <div className="rounded-md bg-blue-50 p-3 space-y-3 border border-blue-100 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-blue-900">Repetir por quantos meses?</label>
                <input required type="number" min="2" max="60" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="mt-1 block w-full rounded-md border border-blue-200 p-2 text-sm"/>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="fixedValue" checked={isFixedValue} onChange={(e) => setIsFixedValue(e.target.checked)} className="h-4 w-4 rounded text-blue-600"/>
                <label htmlFor="fixedValue" className="text-sm text-blue-800 cursor-pointer">Valor é fixo?</label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isLoading} className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">{isLoading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}