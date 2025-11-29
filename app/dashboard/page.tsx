'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, CalendarClock, Wallet, AlertCircle, PlusCircle } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  
  // Dados dos Cards
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0)
  const [percentageChange, setPercentageChange] = useState(0)
  const [highestExpense, setHighestExpense] = useState<{name: string, value: number} | null>(null)
  const [nextDue, setNextDue] = useState<{name: string, date: string, value: number} | null>(null)
  const [totalIncome, setTotalIncome] = useState(0) 

  // Dados do Gráfico
  const [chartData, setChartData] = useState<any[]>([])
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  
  const currentMonthName = monthNames[new Date().getMonth()]

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

    setUserName(user.email?.split('@')[0] || 'Usuário')

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // --- DATAS PARA OS CARDS (Mês Atual vs Passado) ---
    const startCurrent = new Date(currentYear, currentMonth, 1).toISOString()
    const endCurrent = new Date(currentYear, currentMonth + 1, 0).toISOString()
    const startLast = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const endLast = new Date(currentYear, currentMonth, 0).toISOString()

    // --- DATAS PARA O GRÁFICO (Últimos 12 Meses) ---
    const date12MonthsAgo = new Date(currentYear, currentMonth - 11, 1)
    const startChartDate = date12MonthsAgo.toISOString()

    // 1. QUERY CARDS (Mês Atual)
    const { data: currentExpenses } = await supabase
      .from('expenses')
      .select('value, date, name')
      .eq('user_id', user.id)
      .gte('date', startCurrent)
      .lte('date', endCurrent)

    // 2. QUERY CARDS (Mês Passado)
    const { data: lastExpenses } = await supabase
      .from('expenses')
      .select('value')
      .eq('user_id', user.id)
      .gte('date', startLast)
      .lte('date', endLast)

    // 3. QUERY CARDS (Próximo Vencimento)
    const todayStr = now.toISOString().split('T')[0]
    const { data: nextExpenseData } = await supabase
      .from('expenses')
      .select('name, date, value')
      .eq('user_id', user.id)
      .eq('status', 'pendente')
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .limit(1)
      .single()

    // 4. QUERY GRÁFICO (Últimos 12 Meses)
    const { data: yearExpenses } = await supabase
      .from('expenses')
      .select('value, date')
      .eq('user_id', user.id)
      .gte('date', startChartDate)
      .order('date', { ascending: true })

    // --- CÁLCULOS DOS CARDS ---
    const sumCurrent = currentExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const sumLast = lastExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
    
    setCurrentMonthTotal(sumCurrent)

    if (sumLast === 0) {
      setPercentageChange(sumCurrent > 0 ? 100 : 0)
    } else {
      setPercentageChange(((sumCurrent - sumLast) / sumLast) * 100)
    }

    if (currentExpenses && currentExpenses.length > 0) {
      const highest = currentExpenses.reduce((prev, current) => (prev.value > current.value) ? prev : current)
      setHighestExpense({ name: highest.name, value: highest.value })
    } else {
      setHighestExpense(null)
    }

    setNextDue(nextExpenseData || null)

    // --- CÁLCULO DO GRÁFICO (Agrupar por Mês) ---
    const monthlyDataMap = new Map()
    
    // Inicializa os últimos 12 meses com zero para o gráfico não ficar buracado
    for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, currentMonth - 11 + i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}` // Chave única: "2024-10"
        const label = shortMonthNames[d.getMonth()] // "nov"
        // Adiciona o ano se for janeiro ou o primeiro do gráfico para contexto
        const displayLabel = label 
        
        monthlyDataMap.set(key, {
            originalDate: d,
            name: displayLabel,
            year: d.getFullYear(),
            value: 0
        })
    }

    // Preenche com os valores reais do banco
    yearExpenses?.forEach(exp => {
        const d = new Date(exp.date)
        const key = `${d.getFullYear()}-${d.getMonth()}` // Usa UTC para evitar problema de fuso no agrupamento? Não, o Date construtor resolve local.
        
        if (monthlyDataMap.has(key)) {
            const current = monthlyDataMap.get(key)
            current.value += exp.value
            monthlyDataMap.set(key, current)
        }
    })

    const formattedChartData = Array.from(monthlyDataMap.values())
    setChartData(formattedChartData)
    
    setLoading(false)
  }

  // Tokens de Design
  const isSpendingMore = percentageChange > 0
  const isSpendingLess = percentageChange < 0
  const colors = { red: '#DC2626', green: '#16A34A', blue: '#3B82F6' }
  const cardShadow = "shadow-[0_10px_20px_rgba(0,0,0,0.04)]"
  const iconBaseClass = "flex items-center justify-center w-[42px] h-[42px] rounded-xl shrink-0"
  const currentBalance = totalIncome - currentMonthTotal

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando dashboard...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-6xl space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Visão geral de {currentMonthName}</p>
          </div>
        </div>

        {/* --- CARDS (MANTIDOS) --- */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-2xl bg-white p-7 border border-gray-100 flex flex-col justify-between h-44 ${cardShadow}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Gastos do mês</p>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">R$ {currentMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className={`${iconBaseClass} bg-blue-50 text-blue-600`}><DollarSign size={20} /></div>
            </div>
            <div className="text-sm flex items-center gap-2 mt-auto">
              {isSpendingMore && <span className="flex items-center font-bold bg-red-50 px-2 py-0.5 rounded-full text-xs" style={{ color: colors.red }}><TrendingUp size={12} className="mr-1" /> {percentageChange.toFixed(1)}%</span>}
              {isSpendingLess && <span className="flex items-center font-bold bg-green-50 px-2 py-0.5 rounded-full text-xs" style={{ color: colors.green }}><TrendingDown size={12} className="mr-1" /> {Math.abs(percentageChange).toFixed(1)}%</span>}
              {percentageChange === 0 && <span className="text-gray-400 font-medium">--%</span>}
              <span className="text-gray-400 text-xs">em relação ao mês anterior</span>
            </div>
          </div>

          <div className={`rounded-2xl bg-white p-7 border border-gray-100 flex flex-col justify-between h-44 ${cardShadow}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Saldo do mês</p>
                {totalIncome === 0 ? (
                  <div className="mt-1"><button onClick={() => alert("Em breve!")} className="text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors"><PlusCircle size={14}/> Informar renda</button></div>
                ) : (
                  <h3 className="text-3xl font-bold tracking-tight mt-1" style={{ color: currentBalance < 0 ? colors.red : colors.green }}>R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                )}
              </div>
              <div className={`${iconBaseClass} bg-gray-50 text-gray-500`}><Wallet size={20} /></div>
            </div>
            <p className="text-xs text-gray-400 mt-auto">{totalIncome === 0 ? "Cadastre sua renda para ver o saldo real" : "Resultado do mês"}</p>
          </div>

          <div className={`rounded-2xl bg-white p-7 border border-gray-100 flex flex-col justify-between h-44 ${cardShadow}`}>
            <div className="flex justify-between items-start">
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500 mb-1">Maior despesa</p>
                {highestExpense ? (
                  <div className="mt-3">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2" title={highestExpense.name}>{highestExpense.name}</h3>
                    <p className="text-lg font-semibold mt-1" style={{ color: colors.red }}>R$ {highestExpense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ) : (<h3 className="text-lg font-medium text-gray-400 mt-3">--</h3>)}
              </div>
              <div className={`${iconBaseClass} bg-orange-50 text-orange-600`}><AlertCircle size={20} /></div>
            </div>
            <p className="text-xs text-gray-400 mt-auto">Neste mês</p>
          </div>

          <div className={`rounded-2xl bg-white p-7 border border-gray-100 flex flex-col justify-between h-44 ${cardShadow}`}>
            <div className="flex justify-between items-start">
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500 mb-1">Próximo vencimento</p>
                {nextDue ? (
                  <div className="mt-3">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2" title={nextDue.name}>{nextDue.name}</h3>
                    <p className="text-sm font-medium text-blue-600 mt-1">{new Date(nextDue.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                    <p className="text-sm text-gray-600">R$ {nextDue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ) : (<h3 className="text-sm font-medium text-green-600 mt-4 flex items-center gap-1.5">Nenhum vencimento pendente <span className="text-base">🎉</span></h3>)}
              </div>
              <div className={`${iconBaseClass} bg-indigo-50 text-indigo-600`}><CalendarClock size={20} /></div>
            </div>
          </div>
        </div>

        {/* --- NOVO GRÁFICO DE LINHA (Estilo Financeiro) --- */}
        <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
          <div className="mb-8 text-center">
            <h3 className="text-xl font-bold text-gray-800">Total de Despesas por Mês (R$)</h3>
            <p className="text-sm text-gray-400">Evolução dos últimos 12 meses</p>
          </div>
          
          <div className="h-[350px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  
                  {/* Eixo X com os Meses */}
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6B7280' }} 
                    dy={10}
                  />
                  
                  {/* Eixo Y com Valores em R$ */}
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#6B7280' }} 
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  
                  <Tooltip 
                    cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Despesas']}
                  />
                  
                  {/* Linha Azul Grossa com Bolinhas */}
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#2563EB" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Sem dados suficientes para o gráfico anual.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}