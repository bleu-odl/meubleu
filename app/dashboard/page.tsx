'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, YAxis } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, CalendarClock, Wallet, AlertCircle, PlusCircle } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  
  // Dados Cards
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0)
  const [percentageChange, setPercentageChange] = useState(0)
  const [highestExpense, setHighestExpense] = useState<{name: string, value: number} | null>(null)
  const [nextDue, setNextDue] = useState<{name: string, date: string, value: number} | null>(null)
  const [totalIncome, setTotalIncome] = useState(0) 

  // Dados Gráficos
  const [chartData, setChartData] = useState<any[]>([]) 
  const [topCategories, setTopCategories] = useState<any[]>([])
  
  // --- NOVOS ESTADOS PARA O GRÁFICO 3 ---
  const [rawYearExpenses, setRawYearExpenses] = useState<any[]>([]) // Dados brutos do ano
  const [accountNames, setAccountNames] = useState<string[]>([])    // Lista para o dropdown
  const [selectedAccount, setSelectedAccount] = useState('')        // Conta selecionada
  const [specificChartData, setSpecificChartData] = useState<any[]>([]) // Dados do gráfico 3
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  const currentMonthName = monthNames[new Date().getMonth()]

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Efeito Especial: Atualiza o Gráfico 3 quando muda a seleção do dropdown
  useEffect(() => {
    if (selectedAccount && rawYearExpenses.length > 0) {
      processSpecificChart(selectedAccount, rawYearExpenses)
    }
  }, [selectedAccount, rawYearExpenses])

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

    // Intervalos
    const startCurrent = new Date(currentYear, currentMonth, 1).toISOString()
    const endCurrent = new Date(currentYear, currentMonth + 1, 0).toISOString()
    const startLast = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const endLast = new Date(currentYear, currentMonth, 0).toISOString()
    const date12MonthsAgo = new Date(currentYear, currentMonth - 11, 1)
    const startChartDate = date12MonthsAgo.toISOString()

    // QUERIES
    const { data: currentExpenses } = await supabase.from('expenses').select('value, date, name').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent)
    const { data: lastExpenses } = await supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startLast).lte('date', endLast)
    
    const todayStr = now.toISOString().split('T')[0]
    const { data: nextExpenseData } = await supabase.from('expenses').select('name, date, value').eq('user_id', user.id).eq('status', 'pendente').gte('date', todayStr).order('date', { ascending: true }).limit(1).single()

    // Busca dados anuais para os gráficos
    const { data: yearExpenses } = await supabase
      .from('expenses')
      .select('value, date, name')
      .eq('user_id', user.id)
      .gte('date', startChartDate)
      .order('date', { ascending: true })

    // --- CÁLCULOS CARDS ---
    const sumCurrent = currentExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const sumLast = lastExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
    setCurrentMonthTotal(sumCurrent)

    if (sumLast === 0) setPercentageChange(sumCurrent > 0 ? 100 : 0)
    else setPercentageChange(((sumCurrent - sumLast) / sumLast) * 100)

    if (currentExpenses && currentExpenses.length > 0) {
      const highest = currentExpenses.reduce((prev, current) => (prev.value > current.value) ? prev : current)
      setHighestExpense({ name: highest.name, value: highest.value })
    } else {
      setHighestExpense(null)
    }

    setNextDue(nextExpenseData || null)

    // --- PREPARA DADOS GERAIS ---
    
    // 1. Salva dados brutos para uso local
    setRawYearExpenses(yearExpenses || [])

    // 2. Extrai nomes únicos para o dropdown
    if (yearExpenses) {
        const uniqueNames = Array.from(new Set(yearExpenses.map(item => item.name))).sort()
        setAccountNames(uniqueNames)
        // Seleciona o primeiro automaticamente se houver
        if (uniqueNames.length > 0) setSelectedAccount(uniqueNames[0])
    }

    // 3. Gráfico 1 (Total)
    const monthlyDataMap = new Map()
    for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, currentMonth - 11 + i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        const label = shortMonthNames[d.getMonth()]
        monthlyDataMap.set(key, { name: label, value: 0 })
    }
    yearExpenses?.forEach(exp => {
        const d = new Date(exp.date)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (monthlyDataMap.has(key)) {
            const current = monthlyDataMap.get(key)
            current.value += exp.value
            monthlyDataMap.set(key, current)
        }
    })
    setChartData(Array.from(monthlyDataMap.values()))

    // 4. Gráfico 2 (Top Categories)
    const categoryMap = new Map()
    currentExpenses?.forEach(exp => {
        const currentVal = categoryMap.get(exp.name) || 0
        categoryMap.set(exp.name, currentVal + exp.value)
    })
    const topCategoriesData = Array.from(categoryMap.entries())
        .map(([name, value]) => ({
            name,
            value,
            percent: sumCurrent > 0 ? (value / sumCurrent) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

    setTopCategories(topCategoriesData)
    
    setLoading(false)
  }

  // Lógica separada para o Gráfico 3 (Roda localmente sem ir no banco)
  function processSpecificChart(accountName: string, allExpenses: any[]) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const specificMap = new Map()
    // Inicializa meses zerados
    for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, currentMonth - 11 + i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        const label = shortMonthNames[d.getMonth()]
        specificMap.set(key, { name: label, value: 0 })
    }

    // Filtra e soma apenas a conta selecionada
    allExpenses.filter(e => e.name === accountName).forEach(exp => {
        const d = new Date(exp.date)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (specificMap.has(key)) {
            const current = specificMap.get(key)
            current.value += exp.value
            specificMap.set(key, current)
        }
    })

    setSpecificChartData(Array.from(specificMap.values()))
  }

  // Tokens
  const isSpendingMore = percentageChange > 0
  const isSpendingLess = percentageChange < 0
  const colors = { red: '#DC2626', green: '#16A34A', blue: '#3B82F6', indigo: '#6366F1' }
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

        {/* CARDS */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-2xl bg-white p-7 border border-gray-100 flex flex-col justify-between h-44 ${cardShadow}`}>
            <div className="flex justify-between items-center">
              <div><p className="text-sm font-medium text-gray-500 mb-1">Gastos do mês</p><h3 className="text-3xl font-bold text-gray-900 tracking-tight">R$ {currentMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
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
              <div><p className="text-sm font-medium text-gray-500 mb-1">Saldo do mês</p>{totalIncome === 0 ? (<div className="mt-1"><button onClick={() => alert("Em breve!")} className="text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors"><PlusCircle size={14}/> Informar renda</button></div>) : (<h3 className="text-3xl font-bold tracking-tight mt-1" style={{ color: currentBalance < 0 ? colors.red : colors.green }}>R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>)}</div>
              <div className={`${iconBaseClass} bg-gray-50 text-gray-500`}><Wallet size={20} /></div>
            </div>
            <p className="text-xs text-gray-400 mt-auto">{totalIncome === 0 ? "Cadastre sua renda para ver o saldo real" : "Resultado do mês"}</p>
          </div>

          <div className={`rounded-2xl bg-white p-7 border border-gray-100 flex flex-col justify-between h-44 ${cardShadow}`}>
            <div className="flex justify-between items-start"><div className="w-full"><p className="text-sm font-medium text-gray-500 mb-1">Maior despesa</p>{highestExpense ? (<div className="mt-3"><h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2" title={highestExpense.name}>{highestExpense.name}</h3><p className="text-lg font-semibold mt-1" style={{ color: colors.red }}>R$ {highestExpense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>) : (<h3 className="text-lg font-medium text-gray-400 mt-3">--</h3>)}</div><div className={`${iconBaseClass} bg-orange-50 text-orange-600`}><AlertCircle size={20} /></div></div><p className="text-xs text-gray-400 mt-auto">Neste mês</p>
          </div>

          <div className={`rounded-2xl bg-white p-7 border border-gray-100 flex flex-col justify-between h-44 ${cardShadow}`}>
            <div className="flex justify-between items-start"><div className="w-full"><p className="text-sm font-medium text-gray-500 mb-1">Próximo vencimento</p>{nextDue ? (<div className="mt-3"><h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2" title={nextDue.name}>{nextDue.name}</h3><p className="text-sm font-medium text-blue-600 mt-1">{new Date(nextDue.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p><p className="text-sm text-gray-600">R$ {nextDue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>) : (<h3 className="text-sm font-medium text-green-600 mt-4 flex items-center gap-1.5">Nenhum vencimento pendente <span className="text-base">🎉</span></h3>)}</div><div className={`${iconBaseClass} bg-indigo-50 text-indigo-600`}><CalendarClock size={20} /></div></div>
          </div>
        </div>

        {/* GRÁFICO 1: EVOLUÇÃO GERAL */}
        <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
            <div className="mb-8 text-center">
                <h3 className="text-xl font-bold text-gray-800">Total de Despesas por Mês (R$)</h3>
                <p className="text-sm text-gray-400">Evolução dos últimos 12 meses</p>
            </div>
            <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `${value/1000}k`} />
                    <Tooltip cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Total']} />
                    <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#2563EB" }} />
                    </LineChart>
                </ResponsiveContainer>
                ) : ( <div className="flex h-full items-center justify-center text-gray-400">Sem dados.</div> )}
            </div>
        </div>

        {/* --- GRID INFERIOR (50/50) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* GRÁFICO 2: TOP GASTOS */}
            <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Para onde vai o dinheiro?</h3>
                    <p className="text-sm text-gray-400">Maiores categorias deste mês</p>
                </div>
                <div className="space-y-5">
                    {topCategories.length > 0 ? (
                        topCategories.map((cat, index) => (
                            <div key={index} className="group">
                                <div className="flex justify-between items-center mb-1.5 text-sm">
                                    <span className="font-medium text-gray-700 truncate max-w-[150px]" title={cat.name}>{cat.name}</span>
                                    <div className="text-right">
                                        <span className="font-bold text-gray-900 mr-2">R$ {cat.value.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                        <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{cat.percent.toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percent}%`, backgroundColor: index === 0 ? '#3B82F6' : index === 1 ? '#6366F1' : '#A855F7' }} />
                                </div>
                            </div>
                        ))
                    ) : ( <div className="flex h-[200px] items-center justify-center text-gray-400">Nenhum gasto neste mês.</div> )}
                </div>
            </div>

            {/* GRÁFICO 3: EVOLUÇÃO POR CATEGORIA (NOVO) */}
            <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Evolução por Categoria</h3>
                        <p className="text-sm text-gray-400">Histórico de 12 meses</p>
                    </div>
                    {/* DROPDOWN DE SELEÇÃO */}
                    <select 
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="text-sm border-gray-200 rounded-lg py-1.5 px-3 bg-gray-50 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                        {accountNames.length === 0 && <option>Nenhuma conta</option>}
                        {accountNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>

                <div className="h-[250px] w-full">
                    {specificChartData.length > 0 && selectedAccount ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={specificChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `${value}`} />
                        <Tooltip 
                            cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '5 5' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, selectedAccount]}
                        />
                        {/* Linha Roxa/Indigo para diferenciar do gráfico principal */}
                        <Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={3} dot={{ r: 4, fill: colors.indigo, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#4F46E5" }} />
                        </LineChart>
                    </ResponsiveContainer>
                    ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">Selecione uma categoria.</div>
                    )}
                </div>
            </div>

        </div>

      </div>
    </div>
  )
}