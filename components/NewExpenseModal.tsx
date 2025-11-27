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
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    
    // Prepara o objeto da despesa para salvar
    const newExpense = {
      name,
      value: parseFloat(amount.replace(',', '.')), // Aceita 50,00 ou 50.00
      date,
      type: 'variavel', // Padrão da v0.2
      status: 'pendente'
    }

    await onSave(newExpense)
    
    // Limpa o formulário e fecha
    setName('')
    setAmount('')
    setDate('')
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
          {/* Campo Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Ex: Supermercado"
            />
          </div>

          {/* Campo Valor */}
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

          {/* Campo Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Vencimento</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Botões de Ação */}
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
              {isLoading ? 'Salvando...' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}