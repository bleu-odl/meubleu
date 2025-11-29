'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { Search, Plus, MoreVertical, Edit2, Trash2, X, Check, CreditCard, Tag } from 'lucide-react'

// Paleta de cores pré-definidas
const COLORS = [
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#f59e0b', name: 'Laranja' },
  { hex: '#a855f7', name: 'Roxo' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#6b7280', name: 'Cinza' },
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    is_credit_card: false,
    color: COLORS[0].hex
  })

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => { fetchAccounts() }, [])

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function fetchAccounts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    setAccounts(data || [])
    setLoading(false)
  }

  function openNewModal() {
    setEditingAccount(null)
    setFormData({ name: '', is_credit_card: false, color: COLORS[0].hex })
    setIsModalOpen(true)
  }

  function openEditModal(account: any) {
    setEditingAccount(account)
    setFormData({ 
      name: account.name, 
      is_credit_card: account.is_credit_card, 
      color: account.color || COLORS[0].hex 
    })
    setOpenMenuId(null)
    setIsModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !formData.name.trim()) return

    if (editingAccount) {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: formData.name,
          is_credit_card: formData.is_credit_card,
          color: formData.color
        })
        .eq('id', editingAccount.id)
      
      if (error) alert(error.message)
    } else {
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: formData.name,
        is_credit_card: formData.is_credit_card,
        color: formData.color
      })

      if (error) alert(error.message)
    }

    setIsModalOpen(false)
    fetchAccounts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza?')) return
    await supabase.from('accounts').delete().eq('id', id)
    fetchAccounts()
  }

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Verifica se a cor atual é uma das pré-definidas
  const isCustomColor = !COLORS.some(c => c.hex === formData.color)

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Despesas</h1>
        <p className="text-gray-500 mb-8">Cadastre aqui suas categorias de gastos (Ex: Aluguel, Mercado).</p>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar conta..."
              className="w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <button 
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 shadow-sm font-medium transition-colors"
          >
            <Plus size={20}/> Nova Despesa
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Tag size={48} className="text-gray-200 mb-4"/>
              <p>Nenhuma conta encontrada.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredAccounts.map((acc) => (
                <li key={acc.id} className="p-4 flex justify-between items-center hover:bg-gray-50 group transition-colors">
                  
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white shadow-sm font-bold text-lg"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    >
                      {acc.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                      <span className="font-semibold text-gray-900 block">{acc.name}</span>
                      {acc.is_credit_card && (
                        <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                          <CreditCard size={12}/> Cartão de Crédito
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === acc.id ? null : acc.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <MoreVertical size={20}/>
                    </button>

                    {openMenuId === acc.id && (
                      <div ref={menuRef} className="absolute right-0 top-10 z-10 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100">
                        <div className="py-1">
                          <button
                            onClick={() => openEditModal(acc)}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit2 size={14} className="mr-2" /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-2" /> Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAccount ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Netflix"
                  className="w-full rounded-lg border-gray-300 p-2.5 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* SELETOR DE COR ATUALIZADO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor da Etiqueta</label>
                <div className="flex flex-wrap gap-3">
                  
                  {/* Cores Pré-definidas */}
                  {COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setFormData({...formData, color: color.hex})}
                      className={`h-8 w-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ring-offset-2 ${
                        formData.color === color.hex ? 'ring-2 ring-blue-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {formData.color === color.hex && <Check size={14} className="text-white"/>}
                    </button>
                  ))}

                  {/* --- NOVO: Seletor de Cor Personalizado --- */}
                  {/* Isso é o que mudou: Adicionei este bloco inteiro */}
                  <div className="relative">
                    <input
                      type="color"
                      id="custom-color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="sr-only" // Esconde o input padrão feio do navegador
                    />
                    <label
                      htmlFor="custom-color"
                      className={`h-8 w-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ring-offset-2 cursor-pointer bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-200 ${
                        isCustomColor ? 'ring-2 ring-blue-500 scale-110' : ''
                      }`}
                      title="Cor Personalizada"
                    >
                      {/* Mostra o 'Check' se for uma cor personalizada, senão mostra o '+' */}
                      {isCustomColor ? (
                        <Check size={14} className="text-gray-600" />
                      ) : (
                        <Plus size={14} className="text-gray-600" />
                      )}
                    </label>
                  </div>
                  {/* Fim do novo seletor */}

                </div>
              </div>

              <div 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.is_credit_card ? 'bg-purple-50 border-purple-200' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setFormData({...formData, is_credit_card: !formData.is_credit_card})}
              >
                <div className={`p-2 rounded-full ${formData.is_credit_card ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                  <CreditCard size={20}/>
                </div>
                <div>
                  <span className={`text-sm font-medium block ${formData.is_credit_card ? 'text-purple-900' : 'text-gray-900'}`}>
                    É Cartão de Crédito?
                  </span>
                  <span className="text-xs text-gray-500">Marca esta conta como fatura de cartão</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.is_credit_card} 
                  readOnly 
                  className="ml-auto h-5 w-5 rounded text-purple-600 focus:ring-purple-500 pointer-events-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                >
                  {editingAccount ? 'Salvar Alterações' : 'Criar Despesa'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}