import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

// Utilitários de data
const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }

  // 1. Definição de Datas
  const today = new Date()
  const selectedMonth = params.month ? parseInt(params.month) : today.getMonth()
  const selectedYear = params.year ? parseInt(params.year) : today.getFullYear()

  // Intervalos
  const startCurrentDate = new Date(selectedYear, selectedMonth, 1).toISOString()
  const endCurrentDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString()
  
  const startLastDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString()
  const endLastDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999).toISOString()
  
  const date12MonthsAgo = new Date(selectedYear, selectedMonth - 11, 1).toISOString()

  // 2. Buscas Paralelas
  const [
    userData,
    { data: currentExpenses },
    { data: lastExpenses },
    { data: currentIncomes },
    { data: yearExpenses },
    { data: yearIncomes },
    { data: nextExpenseData }
  ] = await Promise.all([
    supabase.from('users').select('plano, full_name, username').eq('id', user.id).single(),
    supabase.from('expenses').select('id, value, date, name, is_credit_card').eq('user_id', user.id).gte('date', startCurrentDate).lte('date', endCurrentDate),
    supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startLastDate).lte('date', endLastDate),
    supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startCurrentDate).lte('date', endCurrentDate),
    supabase.from('expenses').select('value, date, name').eq('user_id', user.id).gte('date', date12MonthsAgo).order('date', { ascending: true }),
    supabase.from('incomes').select('amount, date').eq('user_id', user.id).gte('date', date12MonthsAgo),
    supabase.from('expenses').select('name, date, value').eq('user_id', user.id).eq('status', 'pendente').gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(1).single()
  ])

  // 3. Processamento de Dados
  const sumCurrent = currentExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
  const sumLast = lastExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
  const totalIncome = currentIncomes?.reduce((acc, curr) => acc + curr.amount, 0) || 0
  
  const percentageChange = sumLast === 0 ? (sumCurrent > 0 ? 100 : 0) : ((sumCurrent - sumLast) / sumLast) * 100
  
  const highestExpense = currentExpenses && currentExpenses.length > 0
    ? currentExpenses.reduce((prev, current) => (prev.value > current.value) ? prev : current)
    : null

  let healthScore = 50
  if (totalIncome > 0) {
    if (sumCurrent > totalIncome) healthScore = Math.max(0, 50 - ((sumCurrent / totalIncome - 1) * 50))
    else healthScore = Math.min(100, 50 + (((totalIncome - sumCurrent) / totalIncome / 0.3) * 50))
  } else if (sumCurrent === 0) healthScore = 50
  healthScore = Math.round(healthScore)

  // Gráfico Fluxo de Caixa (Anual)
  const monthlyDataMap = new Map()
  for (let i = 0; i < 12; i++) {
      const d = new Date(selectedYear, selectedMonth - 11 + i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      monthlyDataMap.set(key, { name: shortMonthNames[d.getMonth()], expense: 0, income: 0 })
  }
  const getCompetenceKey = (dateStr: string) => { const d = new Date(dateStr); return `${d.getFullYear()}-${d.getMonth()}` }
  
  yearExpenses?.forEach(exp => { const key = getCompetenceKey(exp.date); if(monthlyDataMap.has(key)) monthlyDataMap.get(key).expense += exp.value })
  yearIncomes?.forEach(inc => { const key = getCompetenceKey(inc.date); if(monthlyDataMap.has(key)) monthlyDataMap.get(key).income += inc.amount })
  const chartData = Array.from(monthlyDataMap.values())

  // Top Categorias
  const catMap = new Map()
  currentExpenses?.forEach(exp => { catMap.set(exp.name, (catMap.get(exp.name) || 0) + exp.value) })
  const topCategories = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value: value as number, percent: sumCurrent > 0 ? ((value as number) / sumCurrent) * 100 : 0 }))
    .sort((a, b) => b.value - a.value).slice(0, 5)

  // Cartão de Crédito
  const creditExpenseIds = currentExpenses?.filter(e => e.is_credit_card).map(e => e.id) || []
  let ccTransactions: any[] = []
  if (creditExpenseIds.length > 0) {
      const { data: trans } = await supabase.from('card_transactions').select('amount, category, description, created_at').in('expense_id', creditExpenseIds)
      ccTransactions = trans || []
  }
  const ccCatMap = new Map()
  ccTransactions.forEach(t => ccCatMap.set(t.category, (ccCatMap.get(t.category) || 0) + t.amount))
  const ccCategoryData = Array.from(ccCatMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => (b.value as number) - (a.value as number))
  const ccTotal = ccTransactions.reduce((acc, curr) => acc + curr.amount, 0)

  // Nomes das contas para o filtro
  const accountNames = Array.from(new Set(yearExpenses?.map(item => item.name))).sort()

  const dashboardData = {
    currentMonthTotal: sumCurrent,
    percentageChange,
    highestExpense: highestExpense ? { name: highestExpense.name, value: highestExpense.value } : null,
    nextDue: nextExpenseData,
    totalIncome,
    healthScore,
    chartData,
    topCategories,
    ccCategoryData,
    ccTotal,
    ccTransactions,
    accountNames,
    // ADICIONADO: Enviamos os dados brutos do ano para o client poder filtrar
    rawYearExpenses: yearExpenses || [] 
  }

  let displayName = 'Usuário'
  if (userData.data?.full_name) displayName = userData.data.full_name.split(' ')[0]
  else if (userData.data?.username) displayName = userData.data.username

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-7xl">
        <DashboardClient 
          data={dashboardData} 
          userProfile={{ name: displayName, plan: userData.data?.plano || 'free' }}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>
    </div>
  )
}