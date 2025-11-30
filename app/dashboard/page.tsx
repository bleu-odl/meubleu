'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, YAxis, PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, CalendarClock, Wallet, AlertCircle, PlusCircle, Lock, CreditCard, TrendingUp as GraphIcon } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userPlan, setUserPlan] = useState('free') 
  
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0)
  const [percentageChange, setPercentageChange] = useState(0)
  const [highestExpense, setHighestExpense] = useState<{name: string, value: number} | null>(null)
  const [nextDue, setNextDue] = useState<{name: string, date: string, value: number} | null>(null)
  const [totalIncome, setTotalIncome] = useState(0) 

  const [chartData, setChartData] = useState<any[]>([]) 
  const [topCategories, setTopCategories] = useState<any[]>([])
  
  // DADOS CARTÃO
  const [ccCategoryData, setCcCategoryData] = useState<any[]>([])
  const [ccTotal, setCcTotal] = useState(0)
  const [ccDailyAccumulated, setCcDailyAccumulated] = useState<any[]>([]) 

  const [rawYearExpenses, setRawYearExpenses] = useState<any[]>([]) 
  const [accountNames, setAccountNames] = useState<string[]>([])    
  const [selectedAccount, setSelectedAccount] = useState('')        
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  const currentMonthName = monthNames[new Date().getMonth()]

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

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

    const { data: userData } = await supabase.from('users').select('plano').eq('id', user.id).single()
    if (userData) setUserPlan(userData.plano)

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const startCurrent = new Date(currentYear, currentMonth, 1).toISOString()
    const endCurrent = new Date(currentYear, currentMonth + 1, 0).toISOString()
    const startLast = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const endLast = new Date(currentYear, currentMonth, 0).toISOString()
    const date12MonthsAgo = new Date(currentYear, currentMonth - 11, 1)
    const startChartDate = date12MonthsAgo.toISOString()

    const { data: currentExpenses } = await supabase.from('expenses').select('id, value, date, name, is_credit_card').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent)
    const { data: lastExpenses } = await supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startLast).lte('date', endLast)
    const todayStr = now.toISOString().split('T')[0]
    const { data: nextExpenseData } = await supabase.from('expenses').select('name, date, value').eq('user_id', user.id).eq('status', 'pendente').gte('date', todayStr).order('date', { ascending: true }).limit(1).single()
    const { data: yearExpenses } = await supabase.from('expenses').select('value, date, name').eq('user_id', user.id).gte('date', startChartDate).order('date', { ascending: true })
    const { data: currentIncomes } = await supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent)

    const creditExpenseIds = currentExpenses?.filter(e => e.is_credit_card).map(e => e.id) || []
    
    let transactions: any[] = []
    if (creditExpenseIds.length > 0) {
        const { data: transData } = await supabase
            .from('card_transactions')
            .select('amount, category, created_at') 
            .in('expense_id', creditExpenseIds)
            .order('created_at', { ascending: true })
        transactions = transData || []
    }

    const sumCurrent = currentExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const sumLast = lastExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const sumIncome = currentIncomes?.reduce((acc, curr) => acc + curr.amount, 0) || 0
    
    setCurrentMonthTotal(sumCurrent)
    setTotalIncome(sumIncome)

    if (sumLast === 0) setPercentageChange(sumCurrent > 0 ? 100 : 0)
    else setPercentageChange(((sumCurrent - sumLast) / sumLast) * 100)

    if (currentExpenses && currentExpenses.length > 0) {
      const highest = currentExpenses.reduce((prev, current) => (prev.value > current.value) ? prev : current)
      setHighestExpense({ name: highest.name, value: highest.value })
    } else {
      setHighestExpense(null)
    }

    setNextDue(nextExpenseData || null)

    const ccTotalVal = transactions.reduce((acc, curr) => acc + curr.amount, 0)
    setCcTotal(ccTotalVal)

    const catMap = new Map()
    transactions.forEach(t => {
        catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount)
    })
    const formattedCcData = Array.from(catMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    setCcCategoryData(formattedCcData)

    const dailyAccumulatedMap = new Map()
    let runningTotal = 0
    
    transactions.forEach(t => {
        const day = new Date(t.created_at).getDate()
        runningTotal += t.amount 
        dailyAccumulatedMap.set(day, runningTotal)
    })

    const dailyData = Array.from(dailyAccumulatedMap.entries())
        .map(([day, value]) => ({ day: `Dia ${day}`, value }))
        .sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1]))
    
    setCcDailyAccumulated(dailyData)

    setRawYearExpenses(yearExpenses || [])
    if (yearExpenses) {
        const uniqueNames = Array.from(new Set(yearExpenses.map(item => item.name))).sort()
        setAccountNames(uniqueNames)
        if (uniqueNames.length > 0) setSelectedAccount(uniqueNames[0])
    }

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

  function processSpecificChart(accountName: string, allExpenses: any[]) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const specificMap = new Map()
    for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, currentMonth - 11 + i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        const label = shortMonthNames[d.getMonth()]
        specificMap.set(key, { name: label, value: 0 })
    }

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

  const isSpendingMore = percentageChange > 0
  const isSpendingLess = percentageChange < 0
  const colors = { red: '#DC2626', green: '#16A34A', blue: '#3B82F6', indigo: '#6366F1', purple: '#A855F7', orange: '#F97316' }
  const categoryColors: Record<string, string> = { 'Alimentação': '#F97316', 'Transporte': '#3B82F6', 'Lazer': '#A855F7', 'Mercado': '#22C55E', 'Serviços': '#6B7280', 'Compras': '#EC4899', 'Saúde': '#EF4444', 'Outros': '#94A3B8' }
  const cardShadow = "shadow-[0_10px_20px_rgba(0,0,0,0.04)]"
  const iconBaseClass = "flex items-center justify-center w-[42px] h-[42px] rounded-xl shrink-0"
  const currentBalance = totalIncome - currentMonthTotal

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando dashboard...</div>

  const PremiumOverlay = () => (
    <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-gray-200">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 rounded-full mb-3 shadow-lg">
        <Lock className="text-yellow-400" size={24} />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Análise Premium</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">
        Visualize seus gastos por categoria dentro do cartão de crédito.
      </p>
      <button onClick={() => alert('Vai para checkout')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-md transition-all active:scale-95">
        Seja Premium
      </button>
    </div>
  )

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
          {/* ... (Cards mantidos igual) ... */}
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
              <div><p className="text-sm font-medium text-gray-500 mb-1">Saldo do mês</p>{totalIncome === 0 ? (<div className="mt-1"><button onClick={() => router.push('/incomes')} className="text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors"><PlusCircle size={14}/> Informar renda</button></div>) : (<h3 className="text-3xl font-bold tracking-tight mt-1" style={{ color: currentBalance < 0 ? colors.red : colors.green }}>R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>)}</div>
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

        {/* GRÁFICO 1 */}
        <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
            <div className="mb-8 text-center"><h3 className="text-xl font-bold text-gray-800">Total de Despesas por Mês (R$)</h3><p className="text-sm text-gray-400">Evolução dos últimos 12 meses</p></div>
            <div className="h-[350px] w-full">{chartData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `${value/1000}k`} /><Tooltip cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Total']} /><Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#2563EB" }} /></LineChart></ResponsiveContainer>) : ( <div className="flex h-full items-center justify-center text-gray-400">Sem dados.</div> )}</div>
        </div>

        {/* LINHA 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
                <div className="mb-6"><h3 className="text-lg font-bold text-gray-900">Para onde vai o dinheiro?</h3><p className="text-sm text-gray-400">Maiores categorias deste mês</p></div>
                <div className="space-y-5">{topCategories.length > 0 ? (topCategories.map((cat, index) => (<div key={index} className="group"><div className="flex justify-between items-center mb-1.5 text-sm"><span className="font-medium text-gray-700 truncate max-w-[150px]" title={cat.name}>{cat.name}</span><div className="text-right"><span className="font-bold text-gray-900 mr-2">R$ {cat.value.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span><span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{cat.percent.toFixed(0)}%</span></div></div><div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percent}%`, backgroundColor: index === 0 ? '#3B82F6' : index === 1 ? '#6366F1' : '#A855F7' }} /></div></div>))) : ( <div className="flex h-[200px] items-center justify-center text-gray-400">Nenhum gasto neste mês.</div> )}</div>
            </div>

            <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
                <div className="mb-6 flex items-center justify-between">
                    <div><h3 className="text-lg font-bold text-gray-900">Evolução por Categoria</h3><p className="text-sm text-gray-400">Histórico de 12 meses</p></div>
                    <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="text-sm border-gray-200 rounded-lg py-1.5 px-3 bg-gray-50 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-gray-100 transition-colors">
                        {accountNames.length === 0 && <option>Nenhuma conta</option>}
                        {accountNames.map(name => (<option key={name} value={name}>{name}</option>))}
                    </select>
                </div>
                <div className="h-[250px] w-full">{specificChartData.length > 0 && selectedAccount ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={specificChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `${value}`} /><Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, selectedAccount]} /><Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={3} dot={{ r: 4, fill: colors.indigo, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#4F46E5" }} /></LineChart></ResponsiveContainer>) : ( <div className="flex h-full items-center justify-center text-gray-400">Selecione uma categoria.</div> )}</div>
            </div>
        </div>

        {/* --- SEÇÃO PREMIUM (RESTAURADA) --- */}
        <div className={`relative rounded-2xl bg-white border border-gray-100 overflow-hidden ${cardShadow}`}>
          
          {userPlan === 'free' && <PremiumOverlay />}

          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Gastos por Categoria (Crédito)</h3>
                <p className="text-sm text-gray-500">Detalhamento das faturas de cartão</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Gráfico Pizza */}
              <div className="h-[300px] flex flex-col items-center justify-center">
                <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Categorias</h4>
                {ccCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ccCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {ccCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 text-sm">Sem gastos detalhados no cartão.</div>
                )}
              </div>

              {/* Detalhamento (Lista) */}
              <div className="flex flex-col justify-center space-y-6">
                <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-sm text-purple-800 font-medium mb-1">Total em Faturas</p>
                  <h3 className="text-3xl font-bold text-purple-900">
                    R$ {ccTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-purple-600 mt-2">
                    Soma de todas as transações categorizadas.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Top Categorias</h4>
                  <ul className="space-y-3">
                    {ccCategoryData.slice(0, 5).map((item, index) => (
                      <li key={index} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[item.name] || '#94A3B8' }}></div>
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-gray-900 block">R$ {item.value.toLocaleString('pt-BR')}</span>
                            <span className="text-xs text-gray-400">
                                {ccTotal > 0 ? ((item.value / ccTotal) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* --- NOVO: GRÁFICO 5 (50%) - CRESCIMENTO DA FATURA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl bg-white p-8 border border-gray-100 ${cardShadow}`}>
                <div className="mb-6 flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><GraphIcon size={18}/></div>
                    <h3 className="text-lg font-bold text-gray-900">Crescimento da Fatura</h3>
                </div>
                <div className="h-[250px] w-full relative">
                    
                    {userPlan === 'free' && <PremiumOverlay />}

                    {ccDailyAccumulated.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ccDailyAccumulated} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none' }}
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Acumulado']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                            Nenhum dado diário.
                        </div>
                    )}
                </div>
            </div>
            
            {/* Espaço Vazio para manter 50% */}
            <div className="hidden lg:block"></div>
        </div>

      </div>
    </div>
  )
}