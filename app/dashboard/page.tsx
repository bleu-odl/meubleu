'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, YAxis, AreaChart, Area, PieChart, Pie, Legend, Cell 
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, CalendarClock, Wallet, 
  AlertTriangle, PlusCircle, Lock, CreditCard, TrendingUp as GraphIcon, 
  ChevronDown, Lightbulb, AlertCircle 
} from 'lucide-react'

// --- 1. CONSTANTES GLOBAIS ---
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

// Cores das Categorias
const categoryColors: Record<string, string> = {
  'Alimentação': '#F97316', 
  'Transporte': '#3B82F6',
  'Lazer': '#A855F7',
  'Mercado': '#22C55E',
  'Serviços': '#6B7280',
  'Compras': '#EC4899',
  'Saúde': '#EF4444',
  'Outros': '#94A3B8'
}

// Cores Gerais
const colors = { 
  red: '#EF4444',    
  green: '#16A34A',  
  blue: '#4F46E5',   
  slate: '#0F172A',
  indigo: '#6366F1'
}

// Estilos dos Cards – padrão premium
const cardClass = `
  card 
  relative 
  p-5 
  flex 
  flex-col 
  justify-between 
  h-44
`

const iconBadgeClass =
  "absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-indigo-400"


export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userPlan, setUserPlan] = useState('free') 
  
  // Estados
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const [currentMonthTotal, setCurrentMonthTotal] = useState(0)
  const [percentageChange, setPercentageChange] = useState(0)
  const [highestExpense, setHighestExpense] = useState<{name: string, value: number} | null>(null)
  const [nextDue, setNextDue] = useState<{name: string, date: string, value: number} | null>(null)
  const [totalIncome, setTotalIncome] = useState(0) 

  // Dados Gráficos
  const [chartData, setChartData] = useState<any[]>([]) 
  const [topCategories, setTopCategories] = useState<any[]>([])
  const [ccCategoryData, setCcCategoryData] = useState<any[]>([])
  const [ccTotal, setCcTotal] = useState(0)
  const [ccDailyAccumulated, setCcDailyAccumulated] = useState<any[]>([]) 
  const [rawYearExpenses, setRawYearExpenses] = useState<any[]>([]) 
  const [accountNames, setAccountNames] = useState<string[]>([])    
  const [selectedAccount, setSelectedAccount] = useState('')        
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  
  const currentMonthName = monthNames[selectedMonth]
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchDashboardData() }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (selectedAccount && rawYearExpenses.length > 0) {
      processSpecificChart(selectedAccount, rawYearExpenses)
    }
  }, [selectedAccount, rawYearExpenses])

  async function fetchDashboardData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Pega nome formatado
    const rawName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
    setUserName(formattedName)

    const { data: userData } = await supabase.from('users').select('plano').eq('id', user.id).single()
    if (userData) setUserPlan(userData.plano)

    const currentYear = selectedYear
    const currentMonth = selectedMonth
    const startCurrent = new Date(currentYear, currentMonth, 1).toISOString()
    const endCurrent = new Date(currentYear, currentMonth + 1, 0).toISOString()
    const startLast = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const endLast = new Date(currentYear, currentMonth, 0).toISOString()
    const date12MonthsAgo = new Date(currentYear, currentMonth - 11, 1)
    const startChartDate = date12MonthsAgo.toISOString()

    // Queries
    const { data: currentExpenses } = await supabase.from('expenses').select('id, value, date, name, is_credit_card').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent)
    const { data: lastExpenses } = await supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startLast).lte('date', endLast)
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: nextExpenseData } = await supabase.from('expenses').select('name, date, value').eq('user_id', user.id).eq('status', 'pendente').gte('date', todayStr).order('date', { ascending: true }).limit(1).single()
    
    const { data: yearExpenses } = await supabase.from('expenses').select('value, date, name').eq('user_id', user.id).gte('date', startChartDate).order('date', { ascending: true })
    const { data: currentIncomes } = await supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent)
    const { data: yearIncomes } = await supabase.from('incomes').select('amount, date').eq('user_id', user.id).gte('date', startChartDate)

    // Cartão
    const creditExpenseIds = currentExpenses?.filter(e => e.is_credit_card).map(e => e.id) || []
    let transactions: any[] = []
    if (creditExpenseIds.length > 0) {
        const { data: transData } = await supabase.from('card_transactions').select('amount, category, created_at').in('expense_id', creditExpenseIds).order('created_at', { ascending: true })
        transactions = transData || []
    }

    // Cálculos
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
    transactions.forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount))
    setCcCategoryData(Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value))

    const dailyAccumulatedMap = new Map()
    let runningTotal = 0
    transactions.forEach(t => {
        const day = new Date(t.created_at).getDate()
        runningTotal += t.amount 
        dailyAccumulatedMap.set(day, runningTotal)
    })
    setCcDailyAccumulated(Array.from(dailyAccumulatedMap.entries()).map(([day, value]) => ({ day: `Dia ${day}`, value })).sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1])))

    setRawYearExpenses(yearExpenses || [])
    if (yearExpenses) {
        const uniqueNames = Array.from(new Set(yearExpenses.map(item => item.name))).sort()
        setAccountNames(uniqueNames)
        if (uniqueNames.length > 0) setSelectedAccount(uniqueNames[0])
    }

    const monthlyDataMap = new Map()
    for (let i = 0; i < 12; i++) {
        const d = new Date(new Date().getFullYear(), new Date().getMonth() - 11 + i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        const label = shortMonthNames[d.getMonth()]
        monthlyDataMap.set(key, { name: label, expense: 0, income: 0 })
    }
    yearExpenses?.forEach(exp => {
        const d = new Date(exp.date)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (monthlyDataMap.has(key)) {
            const current = monthlyDataMap.get(key)
            current.expense += exp.value
            monthlyDataMap.set(key, current)
        }
    })
    yearIncomes?.forEach(inc => {
        const d = new Date(inc.date)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (monthlyDataMap.has(key)) {
            const current = monthlyDataMap.get(key)
            current.income += inc.amount
            monthlyDataMap.set(key, current)
        }
    })
    setChartData(Array.from(monthlyDataMap.values()))

    const categoryMap = new Map()
    currentExpenses?.forEach(exp => {
        const currentVal = categoryMap.get(exp.name) || 0
        categoryMap.set(exp.name, currentVal + exp.value)
    })
    setTopCategories(Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value, percent: sumCurrent > 0 ? (value / sumCurrent) * 100 : 0 })).sort((a, b) => b.value - a.value).slice(0, 5))
    
    setLoading(false)
  }

  function processSpecificChart(accountName: string, allExpenses: any[]) {
    const currentYear = new Date().getFullYear()
    const tempMap = new Map()
     for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, selectedMonth - 11 + i, 1)
        const label = shortMonthNames[d.getMonth()]
        tempMap.set(`${d.getFullYear()}-${d.getMonth()}`, { name: label, value: 0 })
     }
     allExpenses.filter(e => e.name === accountName).forEach(exp => {
        const d = new Date(exp.date)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (tempMap.has(key)) {
            const current = tempMap.get(key)
            current.value += exp.value
            tempMap.set(key, current)
        }
     })
     setSpecificChartData(Array.from(tempMap.values()))
  }

  const isSpendingMore = percentageChange > 0
  const isSpendingLess = percentageChange < 0
  const currentBalance = totalIncome - currentMonthTotal
  
  const contextMessage = () => {
    if (currentBalance < 0) return `Você gastou mais do que recebeu e fechou no vermelho.`
    if (currentBalance > 0) return `Você gastou menos do que recebeu e fechou no azul.`
    return `Receitas e despesas empatadas.`
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Carregando dashboard...</div>

  const PremiumOverlay = () => (
    <div className="absolute inset-0 bg-[#1E1F2B]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-white/5">
      <div className="bg-white/10 p-3 rounded-full mb-3 shadow-lg"><Lock className="text-yellow-400" size={24} /></div>
      <h3 className="text-lg font-bold text-white">Análise Premium</h3>
      <p className="text-sm text-slate-400 mb-4 max-w-xs">Visualize seus gastos por categoria dentro do cartão de crédito.</p>
      <button onClick={() => alert('Vai para checkout')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-md transition-all active:scale-95">Seja Premium</button>
    </div>
  )

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* HEADER RESTAURADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-white tracking-tight">Visão Geral</h1>
            <p className="text-slate-400 mt-1">Bem-vindo de volta, <strong className="text-white">{userName}</strong> 👋</p>
            
            {/* Contexto (Badge Sutil) */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-slate-400">
               <Lightbulb size={12} className="text-yellow-500"/>
               {contextMessage()}
            </div>
          </div>

          {/* Direita: Filtros (Estilo Painel) */}
          <div className="card flex items-center p-1.5 rounded-xl">

             
             <div className="flex items-center gap-2 px-3 border-r border-white/10">
                <CalendarClock size={16} className="text-indigo-400"/>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período</span>
             </div>

             {/* Select Mês */}
             <div className="relative">
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
                    className="bg-transparent text-white text-sm font-medium py-2 pl-3 pr-8 cursor-pointer hover:text-indigo-400 transition-colors appearance-none outline-none [&>option]:bg-[#23242f]"
                >
                  {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
             </div>

             {/* Select Ano */}
             <div className="relative">
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                    className="bg-transparent text-white text-sm font-medium py-2 pl-3 pr-8 cursor-pointer hover:text-indigo-400 transition-colors appearance-none outline-none [&>option]:bg-[#23242f]"
                >
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
             </div>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cardClass}>
            <div>
              <p className="text-[13px] font-medium text-slate-400 mb-1">Gastos do mês</p>
              <h3 className="text-[30px] font-bold text-white leading-tight tracking-tight">
                R$ {currentMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className={iconBadgeClass}><DollarSign size={20} strokeWidth={2.5} /></div>
            <div className="mt-auto flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${isSpendingMore ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {isSpendingMore ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                    {Math.abs(percentageChange).toFixed(1)}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium">vs. mês anterior</span>
            </div>
          </div>

          <div className={cardClass}>
            <div>
              <p className="text-[13px] font-medium text-slate-400 mb-1">Saldo do mês</p>
              {totalIncome === 0 ? (
                  <button onClick={() => router.push('/incomes')} className="mt-1 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors w-fit"><PlusCircle size={14}/> Informar renda</button>
              ) : (
                  <h3 className={`text-[30px] font-bold leading-tight tracking-tight ${currentBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
              )}
            </div>
            <div className={iconBadgeClass}><Wallet size={20} strokeWidth={2.5} /></div>
            <p className="text-[13px] text-slate-500 mt-auto">{currentBalance < 0 ? "No vermelho" : "No azul"}</p>
          </div>

          <div className={cardClass}>
            <div className="w-full">
              <p className="text-[13px] font-medium text-slate-400 mb-1">Maior despesa</p>
              {highestExpense ? (
                <>
                    <h3 className="text-lg font-bold text-white leading-snug mt-1 truncate" title={highestExpense.name}>
                    {highestExpense.name}
                    </h3>
                    <p className="text-[22px] font-bold text-red-400 mt-0.5">
                    R$ {highestExpense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </>
              ) : (
                <h3 className="text-lg font-medium text-slate-600 mt-2">--</h3>
              )}
            </div>
            <div className={iconBadgeClass}><AlertTriangle size={20} strokeWidth={2.5} /></div>
            <p className="text-[11px] text-slate-500 mt-auto">Neste mês</p>
          </div>

          <div className={cardClass}>
            <div className="w-full">
              <p className="text-[13px] font-medium text-slate-400 mb-1">Próximo vencimento</p>
              {nextDue ? (
                <>
                  <h3 className="text-lg font-bold text-white leading-snug mt-1 truncate" title={nextDue.name}>
                    {nextDue.name}
                  </h3>
                  <p className="text-[22px] font-bold text-indigo-400 mt-0.5">
                    R$ {nextDue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                    Vence em {new Date(nextDue.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </p>
                </>
              ) : (
                <div className="mt-2">
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                        Nenhum pendente 🎉
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">Tudo pago.</p>
                </div>
              )}
            </div>
            <div className={iconBadgeClass}><CalendarClock size={20} strokeWidth={2.5} /></div>
          </div>
        </div>

        {/* GRÁFICO 1: EVOLUÇÃO COMPARATIVA (LINHA DUPLA) */}
        <div className="card rounded-[18px]">
            <div className="mb-8 text-center">
                <h3 className="text-lg font-bold text-white">Receitas vs. Despesas (Anual)</h3>
                <p className="text-sm text-slate-400">Comparativo dos últimos 12 meses</p>
            </div>
            <div className="h-[350px] w-full">
                {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(value) => `${value/1000}k`} />
                        <Tooltip 
                            cursor={{ stroke: '#4F46E5', strokeWidth: 1, strokeDasharray: '5 5' }} 
                            contentStyle={{ borderRadius: '12px', border: 'none', background: '#1E1F2B', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)' }} 
                            labelStyle={{ color: '#FFF' }}
                            formatter={(value: number, name: string) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, name === 'income' ? 'Receitas' : 'Despesas']}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle"/>
                        <Line type="monotone" dataKey="expense" name="Despesas" stroke={colors.red} strokeWidth={3} dot={{ r: 4, fill: colors.red, strokeWidth: 2, stroke: "#1E1F2B" }} activeDot={{ r: 6, fill: "#FCA5A5" }} />
                        <Line type="monotone" dataKey="income" name="Receitas" stroke={colors.green} strokeWidth={3} dot={{ r: 4, fill: colors.green, strokeWidth: 2, stroke: "#1E1F2B" }} activeDot={{ r: 6, fill: "#6EE7B7" }} />
                    </LineChart>
                </ResponsiveContainer>
                ) : ( <div className="flex h-full items-center justify-center text-slate-500">Sem dados.</div> )}
            </div>
        </div>

        {/* LINHA 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card rounded-[18px]">
                <div className="mb-6"><h3 className="text-lg font-bold text-white">Para onde vai o dinheiro?</h3><p className="text-sm text-slate-400">Maiores categorias deste mês</p></div>
                <div className="space-y-5">{topCategories.length > 0 ? (topCategories.map((cat, index) => (<div key={index} className="group"><div className="flex justify-between items-center mb-1.5 text-sm"><span className="font-medium text-slate-300 truncate max-w-[150px]" title={cat.name}>{cat.name}</span><div className="text-right"><span className="font-bold text-white mr-2">R$ {cat.value.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span><span className="text-xs text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{cat.percent.toFixed(0)}%</span></div></div><div className="h-3 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percent}%`, backgroundColor: index === 0 ? '#4F46E5' : index === 1 ? '#6366F1' : '#8B5CF6' }} /></div></div>))) : ( <div className="flex h-[200px] items-center justify-center text-slate-500">Nenhum gasto neste mês.</div> )}</div>
            </div>

            <div className="card rounded-[18px]">
                <div className="mb-6 flex items-center justify-between">
                    <div><h3 className="text-lg font-bold text-white">Evolução por Categoria</h3><p className="text-sm text-slate-400">Histórico de 12 meses</p></div>
                    <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="text-sm border-white/10 rounded-lg py-1.5 px-3 bg-white/5 text-slate-300 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-white/10 [&>option]:bg-[#1E1F2B]">
                        {accountNames.length === 0 && <option>Nenhuma conta</option>}
                        {accountNames.map(name => (<option key={name} value={name}>{name}</option>))}
                    </select>
                </div>
                <div className="h-[250px] w-full">{specificChartData.length > 0 && selectedAccount ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={specificChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(value) => `${value}`} /><Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '12px', border: 'none', background: '#1E1F2B', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, selectedAccount]} labelStyle={{color: '#FFF'}} /><Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={3} dot={{ r: 4, fill: colors.indigo, strokeWidth: 2, stroke: "#1E1F2B" }} activeDot={{ r: 6, fill: "#4F46E5" }} /></LineChart></ResponsiveContainer>) : ( <div className="flex h-full items-center justify-center text-slate-500">Selecione uma categoria.</div> )}</div>
            </div>
        </div>

        {/* --- SEÇÃO PREMIUM: CARTÃO --- */}
        <div className="card rounded-[18px]">
          {userPlan === 'free' && <PremiumOverlay />}
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><CreditCard size={24} /></div>
              <div><h3 className="text-xl font-bold text-white">Gastos por Categoria (Crédito)</h3><p className="text-sm text-slate-500">Detalhamento das faturas de cartão</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* GRÁFICO DE BARRAS HORIZONTAIS (CORRIGIDO) */}
              <div className="h-[300px] flex flex-col items-center justify-center">
                <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Categorias</h4>
                {ccCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={ccCategoryData} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12, fill: '#94A3B8' }} 
                        width={80} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#ffffff08' }} 
                        contentStyle={{ borderRadius: '8px', border: 'none', background: '#1E1F2B', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)' }} 
                        itemStyle={{color: '#fff'}} 
                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Gasto']} 
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                        {ccCategoryData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#94A3B8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-sm">Sem gastos detalhados.</div>
                )}
              </div>

              <div className="flex flex-col justify-center space-y-6">
                <div className="p-6 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <p className="text-sm text-indigo-300 font-medium mb-1">Total em Faturas</p>
                  <h3 className="text-3xl font-bold text-indigo-400">R$ {ccTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-xs text-indigo-300/60 mt-2">Soma de todas as transações categorizadas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card rounded-[18px]">
                <div className="mb-6 flex items-center gap-2"><div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400"><GraphIcon size={18}/></div><h3 className="text-lg font-bold text-white">Crescimento da Fatura</h3></div>
                <div className="h-[250px] w-full relative">
                    {userPlan === 'free' && <PremiumOverlay />}
                    {ccDailyAccumulated.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><AreaChart data={ccDailyAccumulated} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/><stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="day" tick={{fontSize: 10, fill: '#64748B'}} tickLine={false} axisLine={false} /><YAxis tick={{fontSize: 10, fill: '#64748B'}} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} /><Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: '#1E1F2B', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)' }} labelStyle={{color: '#fff'}} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Acumulado']} /><Area type="monotone" dataKey="value" stroke="#4F46E5" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} /></AreaChart></ResponsiveContainer>) : ( <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum dado diário.</div> )}
                </div>
            </div>
            <div className="hidden lg:block"></div>
        </div>

      </div>
    </div>
  )
}