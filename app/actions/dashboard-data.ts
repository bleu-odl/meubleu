'use server'

import { createClient } from '@/lib/supabase-server'

export async function getAccountYearlyData(year: number, accountName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const startDate = new Date(year, 0, 1).toISOString()
  const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString()

  // Busca apenas as despesas daquela conta naquele ano
  const { data } = await supabase
    .from('expenses')
    .select('value, date')
    .eq('user_id', user.id)
    .eq('name', accountName)
    .gte('date', startDate)
    .lte('date', endDate)

  if (!data) return []

  // Agrega os dados por mês (1 a 12)
  const monthlyData = new Array(12).fill(0)
  
  data.forEach(item => {
    const monthIndex = new Date(item.date).getMonth() // 0 = Jan
    monthlyData[monthIndex] += item.value
  })

  const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

  // Retorna no formato que o gráfico espera
  return monthlyData.map((val, index) => ({
    name: shortMonthNames[index],
    value: val
  }))
}