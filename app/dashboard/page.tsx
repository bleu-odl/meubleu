'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DollarSign, TrendingUp, Calendar, GripHorizontal } from 'lucide-react'

// Importações do Drag & Drop
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Componente Wrapper que permite arrastar o item (Sortable)
function SortableWidget({ id, children }: { id: string, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto', // Fica por cima quando arrasta
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <div className="relative group h-full">
        {/* Ícone de "Pega" para arrastar (aparece ao passar o mouse) */}
        <div 
            {...attributes} 
            {...listeners}
            className="absolute top-2 right-2 p-1 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded z-10"
        >
          <GripHorizontal size={20} />
        </div>
        {children}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [widgets, setWidgets] = useState<any[]>([]) // Lista dos widgets ordenados
  const [totalMonth, setTotalMonth] = useState(0)
  const [chartData, setChartData] = useState<any[]>([])
  const [userName, setUserName] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  // Sensores para detectar o mouse/toque
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUserName(user.email?.split('@')[0] || 'Usuário')

    // 1. Busca a configuração dos Widgets (Ordem)
    const { data: widgetConfig } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true) // Certifique-se que sua coluna no banco chama 'enabled' ou 'enable'
      .order('position', { ascending: true })

    setWidgets(widgetConfig || [])

    // 2. Busca os dados reais (Valores e Gráficos)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    const { data: expenses } = await supabase
      .from('expenses')
      .select('value, date')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (expenses) {
      // Total
      const total = expenses.reduce((acc, curr) => acc + curr.value, 0)
      setTotalMonth(total)

      // Gráfico
      const dailyMap = new Map()
      expenses.forEach(exp => {
        const day = new Date(exp.date).getDate()
        dailyMap.set(day, (dailyMap.get(day) || 0) + exp.value)
      })
      const formattedData = Array.from(dailyMap.keys()).map(day => ({
        day: `Dia ${day}`,
        valor: dailyMap.get(day)
      })).sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1]))

      setChartData(formattedData)
    }
    
    setLoading(false)
  }

  // Função chamada quando você solta o card
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        
        // 1. Reordena visualmente na hora
        const newOrder = arrayMove(items, oldIndex, newIndex)
        
        // 2. Salva a nova ordem no banco (silenciosamente)
        saveNewOrder(newOrder)

        return newOrder
      })
    }
  }

  async function saveNewOrder(newWidgets: any[]) {
    // Atualiza a posição de cada um no banco
    const updates = newWidgets.map((w, index) => ({
      id: w.id,
      user_id: w.user_id,
      widget_type: w.widget_type,
      position: index, // Nova posição
      enabled: w.enabled // Mantém o status
    }))

    const { error } = await supabase.from('dashboard_widgets').upsert(updates)
    if (error) console.error('Erro ao salvar ordem:', error)
  }

  // Renderiza o conteúdo do widget baseado no tipo
  const renderWidgetContent = (type: string) => {
    switch (type) {
      case 'summary':
        return (
          <div className="h-full rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Gasto Total (Mês)</h3>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">
                R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">+12% vs mês passado</p>
            </div>
          </div>
        )
      case 'list':
        return (
          <div className="h-full rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Resumo Rápido</h3>
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <div className="space-y-3 flex-1 overflow-auto">
               <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                 <span className="text-sm text-gray-600">Total de Contas</span>
                 <span className="font-bold">{chartData.length}</span>
               </div>
               <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                 <span className="text-sm text-gray-600">Maior Gasto</span>
                 <span className="font-bold">Variável</span>
               </div>
            </div>
          </div>
        )
      case 'chart':
        return (
          <div className="h-full rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Evolução Diária</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" hide />
                  <Tooltip />
                  <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) return <div className="p-8">Carregando dashboard...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Olá, {userName} 👋</h1>
            <p className="text-gray-500">Arraste os cards para organizar sua visão.</p>
          </div>
        </div>

        {/* ÁREA DE DRAG & DROP */}
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={widgets.map(w => w.id)} 
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {widgets.map((widget) => (
                <SortableWidget key={widget.id} id={widget.id}>
                  {/* Se for gráfico, ocupa 2 colunas, se não ocupa 1 */}
                  <div className={widget.widget_type === 'chart' ? 'md:col-span-2 h-full' : 'h-full'}>
                    {renderWidgetContent(widget.widget_type)}
                  </div>
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>

      </div>
    </div>
  )
}