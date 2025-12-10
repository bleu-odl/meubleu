'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState, useRef, RefObject } from 'react' // Adicionado RefObject
import { Search, Plus, MoreVertical, Edit2, Trash2, X, Check, CreditCard, Tag, GripVertical } from 'lucide-react'
import { useToast } from '../../components/ToastContext'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Tipos
import { Account } from '../../lib/types'

const COLORS = [ { hex: '#3b82f6', name: 'Azul' }, { hex: '#ef4444', name: 'Vermelho' }, { hex: '#22c55e', name: 'Verde' }, { hex: '#f59e0b', name: 'Laranja' }, { hex: '#a855f7', name: 'Roxo' }, { hex: '#ec4899', name: 'Rosa' }, { hex: '#6366f1', name: 'Indigo' }, { hex: '#6b7280', name: 'Cinza' } ]

// Interface corrigida: removido "React." e usado "RefObject" direto
interface SortableItemProps {
  account: Account
  index: number
  total: number
  openEditModal: (acc: Account) => void
  handleDelete: (id: string) => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  menuRef: RefObject<HTMLDivElement | null> 
}

function SortableAccountItem({ account, index, total, openEditModal, handleDelete, openMenuId, setOpenMenuId, menuRef }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })
  const isOpen = openMenuId === account.id
  const isLastItems = index >= total - 2
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    zIndex: isDragging ? 10 : (isOpen ? 50 : 1), 
    opacity: isDragging ? 0.5 : 1, 
    position: 'relative' as const 
  }

  return (
    <li ref={setNodeRef} style={style} className="p-4 flex justify-between items-center hover:bg-white/5 group transition-colors bg-zinc-900 border-b border-white/5 last:border-0 first:rounded-t-xl last:rounded-b-xl">
      <div className="flex items-center gap-4 flex-1">
        <div {...attributes} {...listeners} className="text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-1 touch-none"><GripVertical size={20} /></div>
        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-lg font-bold text-lg ring-2 ring-zinc-900" style={{ backgroundColor: account.color || '#3b82f6' }}>{account.name.charAt(0).toUpperCase()}</div>
        <div><span className="font-bold text-white block text-sm">{account.name}</span>{account.is_credit_card && (<span className="inline-flex items-center gap-1 text-[10px] text-purple-400 font-medium mt-0.5"><CreditCard size={10}/> Crédito</span>)}</div>
      </div>
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : account.id) }} className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><MoreVertical size={18}/></button>
        {isOpen && (<div ref={menuRef} className={`absolute right-0 z-50 w-32 bg-zinc-900 rounded-lg shadow-xl border border-white/10 overflow-hidden ${isLastItems ? 'bottom-10 origin-bottom-right' : 'top-8 origin-top-right'}`}><div className="py-1"><button onClick={() => openEditModal(account)} className="flex w-full items-center px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"><Edit2 size={12} className="mr-2" /> Editar</button><button onClick={() => handleDelete(account.id)} className="flex w-full items-center px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={12} className="mr-2" /> Excluir</button></div></div>)}
      </div>
    </li>
  )
}

export default function AccountsPage() {
  const { addToast } = useToast()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({ name: '', is_credit_card: false, color: COLORS[0].hex })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  useEffect(() => { fetchAccounts() }, [])
  
  useEffect(() => { 
    function h(e: MouseEvent) { 
        // Conversão de tipo segura para Node
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null) 
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h) 
  }, [])

  async function fetchAccounts() { 
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('order_index', { ascending: true }).order('name', { ascending: true })
    setAccounts((data as Account[]) || [])
    setLoading(false) 
  }

  async function handleDragEnd(event: DragEndEvent) { 
    const { active, over } = event
    if (over && active.id !== over.id) { 
        setAccounts((items) => { 
            const oldIndex = items.findIndex((item) => item.id === active.id)
            const newIndex = items.findIndex((item) => item.id === over.id)
            const newOrder = arrayMove(items, oldIndex, newIndex)
            saveOrderToSupabase(newOrder)
            return newOrder 
        }) 
    } 
  }

  async function saveOrderToSupabase(updatedAccounts: Account[]) { 
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updates = updatedAccounts.map((acc, index) => ({ id: acc.id, user_id: user.id, name: acc.name, is_credit_card: acc.is_credit_card, color: acc.color, order_index: index }))
    await supabase.from('accounts').upsert(updates) 
  }

  function openNewModal() { setEditingAccount(null); setFormData({ name: '', is_credit_card: false, color: COLORS[0].hex }); setIsModalOpen(true) }
  function openEditModal(account: Account) { setEditingAccount(account); setFormData({ name: account.name, is_credit_card: account.is_credit_card, color: account.color || COLORS[0].hex }); setOpenMenuId(null); setIsModalOpen(true) }
  
  async function handleSave(e: React.FormEvent) { 
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !formData.name.trim()) return

    let error = null
    let newIndex = !editingAccount && accounts.length > 0 ? accounts.length : editingAccount ? editingAccount.order_index : 0
    
    if (editingAccount) {
      const { error: err } = await supabase.from('accounts').update({ name: formData.name, is_credit_card: formData.is_credit_card, color: formData.color }).eq('id', editingAccount.id)
      error = err
    } else {
      const { error: err } = await supabase.from('accounts').insert({ user_id: user.id, name: formData.name, is_credit_card: formData.is_credit_card, color: formData.color, order_index: newIndex })
      error = err
    }

    if (error) {
        addToast(error.message, 'error')
    } else {
        addToast(editingAccount ? "Conta atualizada!" : "Conta criada com sucesso!", 'success')
        setIsModalOpen(false)
        fetchAccounts()
    }
  }

  async function handleDelete(id: string) { 
    if (!confirm('Tem certeza?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) addToast("Erro ao excluir conta", 'error')
    else {
        addToast("Conta excluída", 'success')
        fetchAccounts()
    }
  }

  const filteredAccounts = accounts.filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const isCustomColor = !COLORS.some(c => c.hex === formData.color)

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8"><h1 className="text-2xl font-bold text-white">Minhas Despesas</h1><p className="text-zinc-400 mt-1 text-sm">Organize suas categorias de gastos.</p></div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-lg border-white/5 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-600 shadow-sm"/></div>
          <button onClick={openNewModal} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 font-bold transition-all active:scale-95 text-sm"><Plus size={18}/> Nova Despesa</button>
        </div>
        <div className="card rounded-xl p-0 overflow-hidden bg-zinc-900/50">
          {loading ? (<div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>) : filteredAccounts.length === 0 ? (<div className="p-12 text-center text-zinc-500 flex flex-col items-center text-sm"><Tag size={40} className="text-zinc-700 mb-3"/><p>Nada encontrado.</p></div>) : (<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={filteredAccounts.map(a => a.id)} strategy={verticalListSortingStrategy}><ul className="divide-y divide-white/5">{filteredAccounts.map((acc, index) => (<SortableAccountItem key={acc.id} account={acc} index={index} total={filteredAccounts.length} openEditModal={openEditModal} handleDelete={handleDelete} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} menuRef={menuRef}/>))}</ul></SortableContext></DndContext>)}
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-zinc-900 rounded-xl border border-white/10 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-white">{editingAccount ? 'Editar' : 'Nova'} Despesa</h2><button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button></div>
            <form onSubmit={handleSave} className="space-y-6">
              <div><label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Nome</label><input autoFocus required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Netflix" className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-zinc-600 text-sm"/></div>
              <div><label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Cor</label><div className="flex flex-wrap gap-3">{COLORS.map((color) => (<button key={color.hex} type="button" onClick={() => setFormData({...formData, color: color.hex})} className={`h-8 w-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ring-offset-2 ring-offset-zinc-900 ${formData.color === color.hex ? 'ring-2 ring-indigo-500 scale-110' : ''}`} style={{ backgroundColor: color.hex }}>{formData.color === color.hex && <Check size={14} className="text-white"/>}</button>))}<div className="relative"><input type="color" id="custom-color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="sr-only" /><label htmlFor="custom-color" className={`h-8 w-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ring-offset-2 ring-offset-zinc-900 cursor-pointer bg-zinc-950 border border-white/10 ${isCustomColor ? 'ring-2 ring-indigo-500 scale-110' : ''}`}>{isCustomColor ? (<Check size={14} className="text-zinc-400" />) : (<Plus size={14} className="text-zinc-500" />)}</label></div></div></div>
              <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.is_credit_card ? 'bg-purple-500/10 border-purple-500/30' : 'bg-zinc-950 border-white/5 hover:bg-white/5'}`} onClick={() => setFormData({...formData, is_credit_card: !formData.is_credit_card})}><div className={`p-2 rounded-md ${formData.is_credit_card ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-zinc-500'}`}><CreditCard size={18}/></div><div><span className={`text-sm font-bold block ${formData.is_credit_card ? 'text-purple-300' : 'text-zinc-300'}`}>É Cartão de Crédito?</span><span className="text-[10px] text-zinc-500">Marca esta conta como fatura.</span></div><input type="checkbox" checked={formData.is_credit_card} readOnly className="ml-auto h-4 w-4 rounded text-purple-500 pointer-events-none bg-zinc-800 border-white/10"/></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-white/10 text-zinc-300 rounded-lg hover:bg-white/5 font-medium transition-colors text-sm">Cancelar</button><button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95 text-sm">{editingAccount ? 'Salvar' : 'Criar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}