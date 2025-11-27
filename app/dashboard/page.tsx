'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [totalMonth, setTotalMonth] = useState(0)
  const [chartData, setChartData] = useState<any[]>([])
  const [userName, setUserName] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

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

    // Pega o nome do usuário (parte antes do @ do email) para dar Oi
    setUserName(user.email?.split('@')[0] || 'Usuário')

    // Define o intervalo do Mês Atual (Dia 1 até Último dia)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    // Busca apenas as despesas do Mês Atual
    const { data: expenses } = await supabase
      .from('expenses')
      .select('value, date, name')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (expenses) {
      // 1. Calcula o Total Gasto
      const total = expenses.reduce((acc, curr) => acc + curr.value, 0)
      setTotalMonth(total)

      // 2. Prepara dados para o Gráfico (Agrupa por Dia)
      // Ex: Transforma varias contas do dia 15 em uma barra só
      const dailyMap = new Map()
      
      expenses.forEach(exp => {
        const day = new Date(exp.date).getDate() // Pega só o dia (1, 15, 20...)
        const currentVal = dailyMap.get(day) || 0
        dailyMap.set(day, currentVal + exp.value)
      })

      // Formata para o Recharts ler
      const formattedData = Array.from(dailyMap.keys()).map(day => ({
        day: `Dia ${day}`,
        valor: dailyMap.get(day)
      })).sort((a, b) => {
        // Ordena os dias (Dia 1 vem antes do Dia 2)
        return parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1])
      })

      setChartData(formattedData)
    }
    
    setLoading(false)
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Carregando dashboard...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Olá, {userName} 👋</h1>
            <p className="text-gray-500">Aqui está o resumo das suas finanças este mês.</p>
          </div>
          <button 
            onClick={() => router.push('/expenses')}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Ver Extrato Completo →
          </button>
        </div>

        {/* Cards de Resumo (Widgets) */}
        <div className="grid gap-4 md:grid-cols-3">
          
          {/* Card 1: Total Gasto */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-500">Gasto Total (Mês)</h3>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              R$ {totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">+12% em relação ao mês passado</p>
          </div>

          {/* Card 2: Exemplo de Widget Futuro */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-500">Contas a Pagar</h3>
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {/* Lógica simples: conta quantas não estão pagas */}
              {chartData.length} 
            </div>
            <p className="text-xs text-gray-500 mt-1">Contas pendentes este mês</p>
          </div>

          {/* Card 3: Exemplo de Widget Futuro */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-500">Maior Gasto</h3>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              Internet
            </div>
            <p className="text-xs text-gray-500 mt-1">Representa 15% do total</p>
          </div>
        </div>

        {/* Gráfico Principal */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">Gasto Diário</h3>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 12, fill: '#6b7280' }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$${value}`} 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Nenhum dado para exibir no gráfico este mês.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}