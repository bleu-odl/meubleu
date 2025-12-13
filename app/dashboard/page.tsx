import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }

  // 1. Definição de Datas
  const today = new Date()
  const selectedMonth = params.month ? parseInt(params.month) : today.getMonth()
  const selectedYear = params.year ? parseInt(params.year) : today.getFullYear()

  // Intervalos do Mês Selecionado
  const startCurrentDate = new Date(selectedYear, selectedMonth, 1).toISOString()
  const endCurrentDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString()
  
  const startLastDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString()
  const endLastDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999).toISOString()
  
  // 2. Buscas Otimizadas
  const [
    userData,
    { data: currentExpenses },
    { data: lastExpenses },
    { data: currentIncomes },
    // AQUI: Trocamos o download de tudo pelo RPC leve
    { data: yearlyBalances }, 
    { data: accountNamesData },
    { data: nextExpenseData }
  ] = await Promise.all([
    supabase.from('users').select('plano, full_name, username').eq('id', user.id).single(),
    // Dados do Mês Atual (necessários para os Cards)
    supabase.from('expenses').select('id, value, date, name, is_credit_card').eq('user_id', user.id).gte('date', startCurrentDate).lte('date', endCurrentDate),
    supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startLastDate).lte('date', endLastDate),
    supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startCurrentDate).lte('date', endCurrentDate),
    
    // RPC: Agregação no banco de dados
    supabase.rpc('get_monthly_balances', { year_input: selectedYear }),

    // Apenas os nomes das contas (para o dropdown), distinct
    supabase.from('accounts').select('name').eq('user_id', user.id).order('name'),

    supabase.from('expenses').select('name, date, value').eq('user_id', user.id).eq('status', 'pendente').gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(1).single()
  ])

  // 3. Processamento de Dados (Agora muito mais leve)
  const sumCurrent = currentExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
  const sumLast = lastExpenses?.reduce((acc, curr) => acc + curr.value, 0) || 0
  const totalIncome = currentIncomes?.reduce((acc, curr) => acc + curr.amount, 0) || 0
  
  const percentageChange = sumLast === 0 ? (sumCurrent > 0 ? 100 : 0) : ((sumCurrent - sumLast) / sumLast) * 100
  
  const highestExpense = currentExpenses && currentExpenses.length > 0
    ? currentExpenses.reduce((prev, current) => (prev.value > current.value) ? prev : current)
    : null

  // Health Score Logic (Mantida igual)
  let healthScore = 50
  if (totalIncome > 0) {
    if (sumCurrent > totalIncome) healthScore = Math.max(0, 50 - ((sumCurrent / totalIncome - 1) * 50))
    else healthScore = Math.min(100, 50 + (((totalIncome - sumCurrent) / totalIncome / 0.3) * 50))
  } else if (sumCurrent === 0) healthScore = 50
  healthScore = Math.round(healthScore)

  // Formatação dos dados do gráfico principal vindo do RPC
  const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  
  const chartData = yearlyBalances?.map((item: any) => ({
    name: shortMonthNames[item.month - 1], // Ajuste pois SQL retorna 1-12
    income: item.total_income,
    expense: item.total_expense
  })) || []

  // Top Categorias do Mês (Client-side aggregation só do mês atual é ok)
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

  const accountNames = accountNamesData ? accountNamesData.map(a => a.name) : []

  const dashboardData = {
    currentMonthTotal: sumCurrent,
    percentageChange,
    highestExpense: highestExpense ? { name: highestExpense.name, value: highestExpense.value } : null,
    nextDue: nextExpenseData,
    totalIncome,
    healthScore,
    chartData, // Agora vem pronto do DB
    topCategories,
    ccCategoryData,
    ccTotal,
    ccTransactions,
    accountNames,
    // REMOVIDO: rawYearExpenses (Não enviamos mais dados brutos)
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