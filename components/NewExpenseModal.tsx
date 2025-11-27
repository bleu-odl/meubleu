'use client'

import { useState } from 'react'

interface NewExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (expense: any) => void
}

export default function NewExpenseModal({ isOpen, onClose, onSave }: NewExpenseModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  
  // NOVOS ESTADOS DA V0.3
  const [type, setType] = useState('variavel') // 'variavel' ou 'fixa'
  const [recurrence, setRecurrence] = useState('') // Quantos meses?
  const [isFixedValue, setIsFixedValue] = useState(false) // Valor é fixo?

  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    
    // Monta o objeto com as novidades da v0.3
    const newExpense = {
      name,
      value: parseFloat(amount.replace(',', '.')),
      date,
      type, 
      status: 'pendente',
      // Se for fixa, manda os dados extras. Se não, manda null.
      recurrence_months: type === 'fixa' ? parseInt(recurrence) : null,
      is_fixed_value: type === 'fixa' ? isFixedValue : false
    }

    await onSave(newExpense)
    
    // Limpa o formulário
    setName('')
    setAmount('')
    setDate('')
    setType('variavel')
    setRecurrence('')
    setIsFixedValue(false)
    setIsLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Nova Despesa</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ABAS DE SELEÇÃO (Variável vs Fixa) */}
          <div className="flex rounded-md bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setType('variavel')}
              className={`flex-1 rounded-md py-1 text-sm font-medium transition-all ${
                type === 'variavel' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Variável (Única)
            </button>
            <button
              type="button"
              onClick={() => setType('fixa')}
              className={`flex-1 rounded-md py-1 text-sm font-medium transition-all ${
                type === 'fixa' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Fixa (Recorrente)
            </button>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
              placeholder={type === 'fixa' ? "Ex: Aluguel" : "Ex: Mercado"}
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
            <input
              required
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {type === 'fixa' ? 'Vencimento (1ª Parcela)' : 'Vencimento'}
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* CAMPOS EXTRAS (Aparecem só se for Fixa) */}
          {type === 'fixa' && (
            <div className="rounded-md bg-blue-50 p-3 space-y-3 border border-blue-100 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-blue-900">Repetir por quantos meses?</label>
                <input
                  required
                  type="number"
                  min="2"
                  max="60"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-blue-200 p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: 12"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fixedValue"
                  checked={isFixedValue}
                  onChange={(e) => setIsFixedValue(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="fixedValue" className="text-sm text-blue-800 cursor-pointer select-none">
                  Valor é fixo? (Replica o valor em todas)
                </label>
              </div>
              <p className="text-xs text-blue-600">
                {isFixedValue 
                  ? "O sistema vai criar todas as parcelas já com o valor preenchido."
                  : "O sistema vai criar as parcelas com valor zerado para você preencher mês a mês."}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Gerando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}