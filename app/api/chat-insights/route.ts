import { createClient } from '@/lib/supabase-server'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Busca rápida de dados para contexto
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

    const [expenses, incomes, userData] = await Promise.all([
        supabase.from('expenses').select('value').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('users').select('full_name').eq('id', user.id).single()
    ])

    const totalExpenses = expenses.data?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const totalIncome = incomes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
    const balance = totalIncome - totalExpenses

    // CORREÇÃO: Usando o modelo mais recente e estável
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      prompt: `
        Você é o consultor financeiro do usuário ${userData.data?.full_name || 'Cliente'}.
        Resumo do mês:
        - Receitas: ${totalIncome}
        - Despesas: ${totalExpenses}
        - Saldo: ${balance}
        
        Dê um conselho curto e direto sobre essa situação financeira.
      `,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()

  } catch (error: any) {
    console.error("Erro API Route:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}