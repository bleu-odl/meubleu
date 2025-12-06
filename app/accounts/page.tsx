'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { Search, Plus, MoreVertical, Edit2, Trash2, X, Check, CreditCard, Tag, GripVertical } from 'lucide-react'

// Imports do DND Kit
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

// --- COMPONENTE DO ITEM ARRASTÁVEL (ATUALIZADO) ---
// Adicionei props 'index' e 'total' para calcular a posição do menu
function SortableAccountItem({ account, index, total, openEditModal, handleDelete, openMenuId, setOpenMenuId, menuRef }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: account.id })

  const isOpen = openMenuId === account.id
  
  // Se for o último ou penúltimo item, o menu abre para cima (bottom-10), senão para baixo (top-10)
  const isLastItems = index >= total - 2 

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Z-Index inteligente: se estiver arrastando OU se o menu estiver aberto, fica por cima
    zIndex: isDragging ? 10 : (isOpen ? 50 : 1), 
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  }

  return (
    <li 
      ref={setNodeRef} 
      style={style} 
      // Adicionado 'first:rounded-t-xl' e 'last:rounded-b-xl' para manter o design bonito sem overflow-hidden no pai
      className="p-4 flex justify-between items-center hover:bg-white/5 group transition-colors bg-[#1E1F2B] border-b border-white/5 last:border-0 first:rounded-t-2xl last:rounded-b-2xl"
    >
      <div className="flex items-center gap-4 flex-1">
        
        {/* Handle de Arrastar */}
        <div 
          {...attributes} 
          {...listeners} 
          className="text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing p-1 touch-none"
        >
          <GripVertical size={20} />
        </div>

        <div 
          className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg font-bold text-lg ring-2 ring-[#23242f]"
          style={{ backgroundColor: account.color || '#3b82f6' }}
        >
          {account.name.charAt(0).toUpperCase()}
        </div>
        
        <div>
          <span className="font-bold text-white block">{account.name}</span>
          {account.is_credit_card && (
            <span className="inline-flex items-center gap-1 text-xs text-purple-400 font-medium mt-0.5">
              <CreditCard size={12}/> Cartão de Crédito
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <button 
          onClick={(e) => {
            e.stopPropagation() 
            setOpenMenuId(isOpen ? null : account.id)
          }}
          className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <MoreVertical size={20}/>
        </button>

        {isOpen && (
          <div 
            ref={menuRef} 
            // Lógica condicional: Se for os últimos itens, usa 'bottom-12' (abre pra cima), senão 'top-10'
            className={`absolute right-0 z-50 w-40 bg-[#1E1F2B] rounded-xl shadow-xl border border-white/10 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 overflow-hidden ${isLastItems ? 'bottom-12 origin-bottom-right' : 'top-10 origin-top-right'}`}
          >
            <div className="py-1">
              <button
                onClick={() => openEditModal(account)}
                className="flex w-full items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Edit2 size={14} className="mr-2" /> Editar
              </button>
              <button
                onClick={() => handleDelete(account.id)}
                className="flex w-full items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} className="mr-2" /> Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

// --- PÁGINA PRINCIPAL ---
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
      .order('order_index', { ascending: true }) 
      .order('name', { ascending: true })

    setAccounts(data || [])
    setLoading(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    if (active.id !== over?.id) {
      setAccounts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        
        const newOrder = arrayMove(items, oldIndex, newIndex)
        saveOrderToSupabase(newOrder)
        
        return newOrder
      })
    }
  }

  async function saveOrderToSupabase(updatedAccounts: any[]) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updates = updatedAccounts.map((acc, index) => ({
      id: acc.id,
      user_id: user.id,
      name: acc.name,
      is_credit_card: acc.is_credit_card,
      color: acc.color,
      order_index: index 
    }))

    const { error } = await supabase.from('accounts').upsert(updates)
    if (error) console.error("Erro ao salvar ordem:", error.message)
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

    let newIndex = 0
    if (!editingAccount && accounts.length > 0) {
        newIndex = accounts.length
    } else if (editingAccount) {
        newIndex = editingAccount.order_index
    }

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
        color: formData.color,
        order_index: newIndex
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

  const isCustomColor = !COLORS.some(c => c.hex === formData.color)

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Minhas Despesas</h1>
          <p className="text-slate-400 mt-1">Organize suas categorias de gastos.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar conta..."
              className="w-full rounded-xl border-white/10 bg-[#23242f] py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-600 shadow-md"
            />
          </div>
          <button 
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 font-medium transition-all active:scale-95"
          >
            <Plus size={20}/> Nova Despesa
          </button>
        </div>

        {/* LISTA (REMOVIDO OVERFLOW-HIDDEN DO PAI) */}
        <div className="card rounded-2xl">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <Tag size={48} className="text-slate-700 mb-4"/>
              <p>Nenhuma conta encontrada.</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={filteredAccounts.map(a => a.id)} 
                strategy={verticalListSortingStrategy}
              >
                <ul className="divide-y divide-white/5">
                  {filteredAccounts.map((acc, index) => (
                    <SortableAccountItem 
                      key={acc.id} 
                      account={acc} 
                      index={index}
                      total={filteredAccounts.length}
                      openEditModal={openEditModal}
                      handleDelete={handleDelete}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      menuRef={menuRef}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* MODAL MANTIDO IGUAL AO ANTERIOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingAccount ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nome</label>
                <input autoFocus required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Netflix" className="w-full rounded-xl border border-white/10 bg-[#181924] p-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none placeholder:text-slate-600"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Cor da Etiqueta</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((color) => (
                    <button key={color.hex} type="button" onClick={() => setFormData({...formData, color: color.hex})} className={`h-8 w-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ring-offset-2 ring-offset-[#23242f] ${formData.color === color.hex ? 'ring-2 ring-indigo-500 scale-110' : ''}`} style={{ backgroundColor: color.hex }} title={color.name}>
                      {formData.color === color.hex && <Check size={14} className="text-white"/>}
                    </button>
                  ))}
                  <div className="relative">
                    <input type="color" id="custom-color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="sr-only" />
                    <label htmlFor="custom-color" className={`h-8 w-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ring-offset-2 ring-offset-[#23242f] cursor-pointer bg-[#181924] border border-white/10 ${isCustomColor ? 'ring-2 ring-indigo-500 scale-110' : ''}`} title="Cor Personalizada">
                      {isCustomColor ? (<Check size={14} className="text-slate-400" />) : (<Plus size={14} className="text-slate-500" />)}
                    </label>
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${formData.is_credit_card ? 'bg-purple-500/10 border-purple-500/30' : 'bg-[#181924] border-white/5 hover:bg-white/5'}`} onClick={() => setFormData({...formData, is_credit_card: !formData.is_credit_card})}>
                <div className={`p-2 rounded-lg ${formData.is_credit_card ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-slate-500'}`}><CreditCard size={20}/></div>
                <div><span className={`text-sm font-bold block ${formData.is_credit_card ? 'text-purple-300' : 'text-slate-300'}`}>É Cartão de Crédito?</span><span className="text-xs text-slate-500">Marca esta conta como fatura de cartão</span></div>
                <input type="checkbox" checked={formData.is_credit_card} readOnly className="ml-auto h-5 w-5 rounded text-purple-500 focus:ring-purple-500 pointer-events-none bg-[#181924] border-white/20"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-white/10 text-slate-300 rounded-xl hover:bg-white/5 font-medium transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95">{editingAccount ? 'Salvar Alterações' : 'Criar Despesa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}