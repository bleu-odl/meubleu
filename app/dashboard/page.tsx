'use client'

import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, YAxis, Legend, Cell 
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, CalendarClock, Wallet, 
  AlertTriangle, PlusCircle, Lock, CreditCard, 
  ChevronDown, ChevronUp, Lightbulb, Activity 
} from 'lucide-react'

// --- CONSTANTES ---
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)

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

const colors = { 
  red: '#F43F5E',    
  green: '#6366F1',
  yellow: '#FBBF24',
  blue: '#818CF8',   
  slate: '#0F172A',
  indigo: '#6366F1'
}

const cardClass = `card relative p-5 flex flex-col justify-between h-44`
const iconBadgeClass = "absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-indigo-400"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userPlan, setUserPlan] = useState('free') 
  const [startDay, setStartDay] = useState(1) 
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const [currentMonthTotal, setCurrentMonthTotal] = useState(0)
  const [percentageChange, setPercentageChange] = useState(0)
  const [highestExpense, setHighestExpense] = useState<{name: string, value: number} | null>(null)
  const [nextDue, setNextDue] = useState<{name: string, date: string, value: number} | null>(null)
  const [totalIncome, setTotalIncome] = useState(0) 
  const [healthScore, setHealthScore] = useState(0)

  const [chartData, setChartData] = useState<any[]>([]) 
  const [topCategories, setTopCategories] = useState<any[]>([])
  const [chartFilter, setChartFilter] = useState('all') 

  const [ccCategoryData, setCcCategoryData] = useState<any[]>([])
  const [ccTransactions, setCcTransactions] = useState<any[]>([]) 
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null) 
  const [ccTotal, setCcTotal] = useState(0)
  
  const [rawYearExpenses, setRawYearExpenses] = useState<any[]>([]) 
  const [accountNames, setAccountNames] = useState<string[]>([])    
  const [selectedAccount, setSelectedAccount] = useState('')        
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchDashboardData() }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (selectedAccount && rawYearExpenses.length > 0) {
      processSpecificChart(selectedAccount, rawYearExpenses, startDay)
    }
  }, [selectedAccount, rawYearExpenses, startDay])

  async function fetchDashboardData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const rawName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
    setUserName(rawName.charAt(0).toUpperCase() + rawName.slice(1))

    const { data: userData } = await supabase.from('users').select('plano, financial_start_day').eq('id', user.id).single()
    if (userData) setUserPlan(userData.plano)
    
    const financialStartDay = userData?.financial_start_day || 1
    setStartDay(financialStartDay)

    // --- DATAS DO CICLO FINANCEIRO ---
    const startCurrentDate = new Date(selectedYear, selectedMonth, financialStartDay)
    const endCurrentDate = new Date(selectedYear, selectedMonth + 1, financialStartDay - 1)
    endCurrentDate.setHours(23, 59, 59, 999)

    const startLastDate = new Date(selectedYear, selectedMonth - 1, financialStartDay)
    const endLastDate = new Date(selectedYear, selectedMonth, financialStartDay - 1)

    const startCurrent = startCurrentDate.toISOString()
    const endCurrent = endCurrentDate.toISOString()
    const startLast = startLastDate.toISOString()
    const endLast = endLastDate.toISOString()

    const date12MonthsAgo = new Date(selectedYear, selectedMonth - 11, 1)
    const startChartDate = date12MonthsAgo.toISOString()

    // --- QUERIES ---
    const { data: currentExpenses } = await supabase.from('expenses').select('id, value, date, name, is_credit_card').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent)
    const { data: lastExpenses } = await supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startLast).lte('date', endLast)
    
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: nextExpenseData } = await supabase.from('expenses').select('name, date, value').eq('user_id', user.id).eq('status', 'pendente').gte('date', todayStr).order('date', { ascending: true }).limit(1).single()
    
    const { data: yearExpenses } = await supabase.from('expenses').select('value, date, name').eq('user_id', user.id).gte('date', startChartDate).order('date', { ascending: true })
    const { data: currentIncomes } = await supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startCurrent).lte('date', endCurrent)
    const { data: yearIncomes } = await supabase.from('incomes').select('amount, date').eq('user_id', user.id).gte('date', startChartDate)

    // --- DADOS DO CARTÃO ---
    const creditExpenseIds = currentExpenses?.filter(e => e.is_credit_card).map(e => e.id) || []
    let transactions: any[] = []
    if (creditExpenseIds.length > 0) {
        const { data: transData } = await supabase.from('card_transactions').select('amount, category, description, created_at').in('expense_id', creditExpenseIds).order('created_at', { ascending: true })
        transactions = transData || []
    }
    setCcTransactions(transactions)

    // --- TOTAIS ---
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

    // --- SCORE ---
    let score = 0
    if (sumIncome > 0) {
        if (sumCurrent > sumIncome) {
            const ratio = sumCurrent / sumIncome
            score = Math.max(0, 50 - ((ratio - 1) * 50))
        } else {
            const savingsRatio = (sumIncome - sumCurrent) / sumIncome
            score = Math.min(100, 50 + ((savingsRatio / 0.3) * 50))
        }
    } else if (sumCurrent === 0) {
        score = 50
    } else {
        score = 0 
    }
    setHealthScore(Math.round(score))
    
    // --- CARTÃO E CATEGORIAS ---
    const ccTotalVal = transactions.reduce((acc, curr) => acc + curr.amount, 0)
    setCcTotal(ccTotalVal)
    const catMap = new Map()
    transactions.forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount))
    setCcCategoryData(Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value))

    // --- OUTROS DADOS ---
    setRawYearExpenses(yearExpenses || [])
    if (yearExpenses) {
        const uniqueNames = Array.from(new Set(yearExpenses.map(item => item.name))).sort()
        setAccountNames(uniqueNames)
        if (uniqueNames.length > 0) setSelectedAccount(uniqueNames[0])
    }

    // --- GRÁFICO ANUAL ---
    const monthlyDataMap = new Map()
    for (let i = 0; i < 12; i++) {
        const d = new Date(selectedYear, selectedMonth - 11 + i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        monthlyDataMap.set(key, { name: shortMonthNames[d.getMonth()], expense: 0, income: 0 })
    }

    const getCompetenceKey = (dateStr: string) => {
        const d = new Date(dateStr)
        if (d.getUTCDate() < financialStartDay) {
            d.setMonth(d.getMonth() - 1)
        }
        return `${d.getFullYear()}-${d.getMonth()}`
    }

    yearExpenses?.forEach(exp => {
        const key = getCompetenceKey(exp.date)
        if (monthlyDataMap.has(key)) { 
            const c = monthlyDataMap.get(key); 
            c.expense += exp.value; 
            monthlyDataMap.set(key, c) 
        }
    })
    yearIncomes?.forEach(inc => {
        const key = getCompetenceKey(inc.date)
        if (monthlyDataMap.has(key)) { 
            const c = monthlyDataMap.get(key); 
            c.income += inc.amount; 
            monthlyDataMap.set(key, c) 
        }
    })
    setChartData(Array.from(monthlyDataMap.values()))

    const catMapMain = new Map()
    currentExpenses?.forEach(exp => { catMapMain.set(exp.name, (catMapMain.get(exp.name) || 0) + exp.value) })
    setTopCategories(Array.from(catMapMain.entries()).map(([name, value]) => ({ name, value, percent: sumCurrent > 0 ? (value / sumCurrent) * 100 : 0 })).sort((a, b) => b.value - a.value).slice(0, 5))
    
    setLoading(false)
  }

  function processSpecificChart(accountName: string, allExpenses: any[], startDay: number) {
    const currentYear = new Date().getFullYear()
    const tempMap = new Map()
     for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, selectedMonth - 11 + i, 1)
        tempMap.set(`${d.getFullYear()}-${d.getMonth()}`, { name: shortMonthNames[d.getMonth()], value: 0 })
     }
     
     const getCompetenceKey = (dateStr: string) => {
        const d = new Date(dateStr)
        if (d.getUTCDate() < startDay) {
            d.setMonth(d.getMonth() - 1)
        }
        return `${d.getFullYear()}-${d.getMonth()}`
    }

     allExpenses.filter(e => e.name === accountName).forEach(exp => {
        const key = getCompetenceKey(exp.date)
        if (tempMap.has(key)) { 
            const c = tempMap.get(key); 
            c.value += exp.value; 
            tempMap.set(key, c) 
        }
     })
     setSpecificChartData(Array.from(tempMap.values()))
  }

  const isSpendingMore = percentageChange > 0
  const currentBalance = totalIncome - currentMonthTotal
  
  const contextMessage = () => {
    if (currentBalance < 0) return `Você gastou mais do que recebeu.`
    if (currentBalance > 0) return `Você gastou menos do que recebeu.`
    return `Receitas e despesas empatadas.`
  }

  const getTransactionsByCategory = (category: string) => {
    return ccTransactions.filter(t => t.category === category)
  }

  const PremiumOverlay = () => (
    <div className="absolute inset-0 bg-[#1E1F2B]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-white/5">
      <div className="bg-white/10 p-3 rounded-full mb-3 shadow-lg"><Lock className="text-yellow-400" size={24} /></div>
      <h3 className="text-lg font-bold text-white">Análise Premium</h3>
      <p className="text-sm text-slate-400 mb-4 max-w-xs">Visualize seus gastos por categoria dentro do cartão de crédito.</p>
      <button onClick={() => alert('Vai para checkout')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-md transition-all active:scale-95">Seja Premium</button>
    </div>
  )

  let scoreTextColor = 'text-red-400' 
  let scoreLabel = 'Crítico'
  let scoreDesc = 'Seus gastos estão excedendo sua renda. Atenção máxima.'
  
  if (healthScore >= 80) {
    scoreTextColor = 'text-indigo-400' 
    scoreLabel = 'Excelente'
    scoreDesc = 'Parabéns! Você está poupando mais de 30% da sua renda.'
  } else if (healthScore >= 50) {
    scoreTextColor = 'text-yellow-400'
    scoreLabel = 'Atenção'
    scoreDesc = 'Você está no limite. Tente reduzir gastos supérfluos.'
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Carregando dashboard...</div>

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-white tracking-tight">Visão Geral</h1>
            <p className="text-slate-400 mt-1">Bem-vindo de volta, <strong className="text-white">{userName}</strong> 👋</p>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
               <Lightbulb size={12} className="text-yellow-500"/> {contextMessage()}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group cursor-help text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">Score</span>
                <div className={`text-3xl font-black ${scoreTextColor} leading-none flex items-center gap-1`}>
                    <Activity size={20} className="opacity-50" /> {healthScore}
                </div>
                <div className="absolute top-full right-0 mt-3 w-64 bg-[#1E1F2B] border border-white/10 rounded-xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Saúde Financeira</span>
                        <span className={`text-xs font-bold ${scoreTextColor}`}>{scoreLabel}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 mb-3 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${healthScore >= 80 ? 'bg-indigo-500' : healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${healthScore}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{scoreDesc}</p>
                </div>
            </div>

            <div className="card flex items-center p-1.5 rounded-xl">
               <div className="flex items-center gap-2 px-3 border-r border-white/10">
                  <CalendarClock size={16} className="text-indigo-400"/>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período</span>
               </div>
               <div className="relative">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-white text-sm font-medium py-2 pl-3 pr-8 cursor-pointer hover:text-indigo-400 transition-colors appearance-none outline-none [&>option]:bg-[#23242f]">
                    {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                  </select>
               </div>
               <div className="relative">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-white text-sm font-medium py-2 pl-3 pr-8 cursor-pointer hover:text-indigo-400 transition-colors appearance-none outline-none [&>option]:bg-[#23242f]">
                     {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
               </div>
            </div>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cardClass}>
            <div>
              <p className="text-[13px] font-medium text-slate-400 mb-1">Gastos do mês</p>
              <h3 className="text-[30px] font-bold text-white">R$ {currentMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
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
                  <button onClick={() => router.push('/incomes')} className="mt-1 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"><PlusCircle size={14}/> Informar renda</button>
              ) : (
                  <h3 className={`text-[30px] font-bold ${currentBalance < 0 ? 'text-red-400' : 'text-indigo-400'}`}>
                    R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
              )}
            </div>
            <div className={iconBadgeClass}><Wallet size={20} strokeWidth={2.5} /></div>
            <p className="text-[13px] text-slate-500 mt-auto">{currentBalance < 0 ? "No vermelho" : "No azul"}</p>
          </div>
          <div className={cardClass}>
            <div className="w-full"><p className="text-[13px] font-medium text-slate-400 mb-1">Maior despesa</p>{highestExpense ? (<><h3 className="text-lg font-bold text-white truncate" title={highestExpense.name}>{highestExpense.name}</h3><p className="text-[22px] font-bold text-red-400 mt-0.5">R$ {highestExpense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></>) : (<h3 className="text-lg font-medium text-slate-600 mt-2">--</h3>)}</div>
            <div className={iconBadgeClass}><AlertTriangle size={20} strokeWidth={2.5} /></div>
            <p className="text-[11px] text-slate-500 mt-auto">Neste mês</p>
          </div>
          <div className={cardClass}>
            <div className="w-full"><p className="text-[13px] font-medium text-slate-400 mb-1">Próximo vencimento</p>{nextDue ? (<><h3 className="text-lg font-bold text-white truncate" title={nextDue.name}>{nextDue.name}</h3><p className="text-[22px] font-bold text-indigo-400 mt-0.5">R$ {nextDue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-[11px] font-medium text-slate-500 mt-1">Vence {new Date(nextDue.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p></>) : (<div className="mt-2"><h3 className="text-sm font-bold text-emerald-400">Nenhum pendente 🎉</h3></div>)}</div>
            <div className={iconBadgeClass}><CalendarClock size={20} strokeWidth={2.5} /></div>
          </div>
        </div>

        {/* GRÁFICO 1 */}
        <div className="card rounded-[18px]">
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white">Fluxo de Caixa</h3>
                    <p className="text-sm text-slate-400">Comparativo anual</p>
                </div>
                <div className="bg-[#1E1F2B] p-1 rounded-xl border border-white/5 flex">
                    {[{ key: 'all', label: 'Visão Geral' }, { key: 'income', label: 'Receitas' }, { key: 'expense', label: 'Despesas' }].map((filter) => (
                        <button key={filter.key} onClick={() => setChartFilter(filter.key)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${chartFilter === filter.key ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>{filter.label}</button>
                    ))}
                </div>
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
                            formatter={(value: number, name: string) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, name === 'income' ? 'Receitas' : 'Despesas']}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle"/>
                        {(chartFilter === 'all' || chartFilter === 'expense') && (<Line type="monotone" dataKey="expense" name="Despesas" stroke={colors.red} strokeWidth={3} dot={{ r: 4, fill: colors.red, strokeWidth: 2, stroke: "#1E1F2B" }} activeDot={{ r: 6, fill: colors.red }} animationDuration={1000}/>)}
                        {(chartFilter === 'all' || chartFilter === 'income') && (<Line type="monotone" dataKey="income" name="Receitas" stroke={colors.green} strokeWidth={3} dot={{ r: 4, fill: colors.green, strokeWidth: 2, stroke: "#1E1F2B" }} activeDot={{ r: 6, fill: colors.green }} animationDuration={1000}/>)}
                    </LineChart>
                </ResponsiveContainer>
                ) : ( <div className="flex h-full items-center justify-center text-slate-500">Sem dados.</div> )}
            </div>
        </div>

        {/* LINHA 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card rounded-[18px]">
              <div className="mb-6"><h3 className="text-lg font-bold text-white">Para onde vai o dinheiro?</h3><p className="text-sm text-slate-400">Maiores categorias deste mês</p></div>
              <div className="space-y-5">
                {topCategories.length > 0 ? (topCategories.map((cat, index) => (
                  <div key={index} className="group">
                    <div className="flex justify-between items-center mb-1.5 text-sm">
                      <span className="font-medium text-slate-300 truncate max-w-[150px]" title={cat.name}>{cat.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-white mr-2">R$ {cat.value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        <span className="text-xs text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{cat.percent.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percent}%`, backgroundColor: index === 0 ? '#4F46E5' : index === 1 ? '#6366F1' : '#8B5CF6' }} /></div>
                  </div>))) : ( <div className="flex h-[200px] items-center justify-center text-slate-500">Nenhum gasto neste mês.</div> )}
              </div>
            </div>
            
            <div className="card rounded-[18px]">
              <div className="mb-6 flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Evolução por Categoria</h3><p className="text-sm text-slate-400">Histórico de 12 meses</p></div><select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="text-sm border-white/10 rounded-lg py-1.5 px-3 bg-white/5 text-slate-300 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-white/10 [&>option]:bg-[#1E1F2B]">{accountNames.map(name => (<option key={name} value={name}>{name}</option>))}</select></div>
              <div className="h-[250px] w-full">{specificChartData.length > 0 && selectedAccount ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={specificChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(value) => `${value}`} />
              <Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '12px', border: 'none', background: '#1E1F2B', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, selectedAccount]} labelStyle={{color: '#FFF'}} />
              <Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={3} dot={{ r: 4, fill: colors.indigo, strokeWidth: 2, stroke: "#1E1F2B" }} activeDot={{ r: 6, fill: "#4F46E5" }} /></LineChart></ResponsiveContainer>) : ( <div className="flex h-full items-center justify-center text-slate-500">Selecione uma categoria.</div> )}</div>
            </div>
        </div>

        {/* SEÇÃO PREMIUM: CARTÃO */}
        <div className="card rounded-[18px]">
          {userPlan === 'free' && <PremiumOverlay />}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><CreditCard size={24} /></div>
                  <div><h3 className="text-xl font-bold text-white">Gastos por Categoria (Crédito)</h3><p className="text-sm text-slate-500">Detalhamento das faturas de cartão</p></div>
                </div>
                <div className="h-[300px] flex flex-col items-center justify-center">
                  <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Categorias</h4>
                  {ccCategoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ccCategoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#94A3B8' }} width={80} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ borderRadius: '8px', border: 'none', background: '#1E1F2B', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)' }} itemStyle={{color: '#fff'}} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'Gasto']} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                          {ccCategoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#94A3B8'} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : ( <div className="text-slate-500 text-sm">Sem gastos detalhados.</div> )}
                </div>
              </div>
              <div className="flex flex-col h-[380px]"> 
                <div className="shrink-0 p-6 bg-indigo-500/5 rounded-xl border border-indigo-500/10 mb-4">
                  <p className="text-sm text-indigo-300 font-medium mb-1">Total em Faturas</p>
                  <h3 className="text-3xl font-bold text-indigo-400">R$ {ccTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  <p className="text-xs text-indigo-300/60 mt-2">Soma de todas as transações categorizadas.</p>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-3 custom-scrollbar">
                  {ccCategoryData.map((cat) => {
                    const isOpen = expandedCategory === cat.name;
                    return (
                      <div key={cat.name} className="border border-white/5 rounded-xl overflow-hidden bg-[#23242f] shrink-0">
                        <button onClick={() => setExpandedCategory(isOpen ? null : cat.name)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3"><div className="w-2 h-8 rounded-full" style={{ backgroundColor: categoryColors[cat.name] || '#94A3B8' }}></div><span className="text-sm font-bold text-white">{cat.name}</span></div>
                          <div className="flex items-center gap-3"><span className="text-sm text-slate-300 font-medium">R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>{isOpen ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}</div>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 animate-in slide-in-from-top-1 bg-black/20">
                            <ul className="divide-y divide-white/5">
                              {getTransactionsByCategory(cat.name).map((t, idx) => (
                                <li key={idx} className="py-2.5 flex justify-between items-center text-xs">
                                  <div className="text-slate-400 truncate max-w-[150px] mr-2">{t.description || "Sem descrição"}</div>
                                  <div className="text-white font-medium whitespace-nowrap">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </li>
                              ))}
                              {getTransactionsByCategory(cat.name).length === 0 && (<li className="py-2 text-center text-xs text-slate-500">Sem itens detalhados.</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}