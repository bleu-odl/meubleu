import { createClient } from '@/lib/supabase-server'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const supabase = await createClient()
  
  // 1. Segurança
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // 2. Dados
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

  const [expenses, incomes, userData] = await Promise.all([
    supabase.from('expenses').select('name, value, type').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
    supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
    supabase.from('users').select('full_name').eq('id', user.id).single()
  ])

  const totalExpenses = expenses.data?.reduce((acc, curr) => acc + curr.value, 0) || 0
  const totalIncome = incomes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
  const balance = totalIncome - totalExpenses

  // 3. IA Streaming
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    prompt: `
      Você é o "Bleu IA", um consultor financeiro pessoal.
      Usuário: ${userData.data?.full_name || 'Cliente'}.
      Mês Atual: ${today.toLocaleString('pt-BR', { month: 'long' })}.
      
      Dados:
      - Receita: R$ ${totalIncome}
      - Despesas: R$ ${totalExpenses}
      - Saldo: R$ ${balance}
      - Top Gastos: ${JSON.stringify(expenses.data?.sort((a, b) => b.value - a.value).slice(0, 5))}

      Sua missão:
      1. Dê um diagnóstico rápido (1 parágrafo).
      2. Cite onde ele gastou mais.
      3. Dê uma dica prática para o saldo restante.
      
      Use Markdown. Seja direto e motivador.
    `,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}