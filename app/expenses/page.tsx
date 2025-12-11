import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import ExpensesClient from './ExpensesClient'
import { Expense, Account } from '../../lib/types'

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }

  // 1. Definição de Datas (Filtros)
  const today = new Date()
  const selectedMonth = params.month ? parseInt(params.month) : today.getMonth()
  const selectedYear = params.year ? parseInt(params.year) : today.getFullYear()

  let startDate: string
  let endDate: string

  if (selectedYear === -1) {
      startDate = new Date(today.getFullYear() - 10, 0, 1).toISOString()
      endDate = new Date(today.getFullYear() + 10, 11, 31).toISOString()
  } else {
      if (selectedMonth === -1) {
          startDate = new Date(selectedYear, 0, 1).toISOString()
          endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999).toISOString()
      } else {
          startDate = new Date(selectedYear, selectedMonth, 1).toISOString()
          endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString()
      }
  }

  // 2. Buscas Paralelas (User Plan, Accounts, Expenses List, KPI)
  const [
    userData,
    accountsData,
    expensesData,
    yearKpiData
  ] = await Promise.all([
    supabase.from('users').select('plano').eq('id', user.id).single(),
    supabase.from('accounts').select('name, color').eq('user_id', user.id),
    supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: true }),
    // KPI Anual (sempre baseado no ano selecionado)
    supabase.from('expenses').select('value, date').eq('user_id', user.id).gte('date', `${selectedYear === -1 ? today.getFullYear() : selectedYear}-01-01`).lte('date', `${selectedYear === -1 ? today.getFullYear() : selectedYear}-12-31`)
  ])

  const expenses = (expensesData.data as Expense[]) || []
  
  // Mapear Cores das Contas
  const accountsMap: Record<string, string> = {}
  if (accountsData.data) {
    (accountsData.data as Account[]).forEach(acc => { accountsMap[acc.name] = acc.color || '#3b82f6' })
  }

  // Calcular KPI
  let kpiTotalYear = 0
  let kpiMonthlyAverage = 0

  if (yearKpiData.data) {
      kpiTotalYear = yearKpiData.data.reduce((acc, curr) => acc + curr.value, 0)
      
      let divisor = 1
      if ((selectedYear === -1 ? today.getFullYear() : selectedYear) === today.getFullYear()) {
          divisor = today.getMonth() + 1
      } else {
          divisor = 12
      }
      kpiMonthlyAverage = kpiTotalYear / divisor
  }

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-6xl">
        <ExpensesClient 
            initialExpenses={expenses}
            kpiData={{ totalYear: kpiTotalYear, monthlyAverage: kpiMonthlyAverage }}
            accountsMap={accountsMap}
            userPlan={userData.data?.plano || 'free'}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
        />
      </div>
    </div>
  )
}