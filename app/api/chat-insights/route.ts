import { createClient } from '@/lib/supabase-server'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return new Response('Unauthorized', { status: 401 })

    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

    // 1. Buscando Despesas e Receitas
    const [expenses, incomes, userData] = await Promise.all([
        supabase.from('expenses').select('id, name, value, is_credit_card').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('incomes').select('amount').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('users').select('full_name').eq('id', user.id).single()
    ])

    // 2. Buscando Detalhes do Cartão (O "pulo do gato" para a IA ser inteligente)
    let cardTransactions: any[] = []
    const creditExpenseIds = expenses.data?.filter(e => e.is_credit_card).map(e => e.id) || []
    
    if (creditExpenseIds.length > 0) {
        const { data: ct } = await supabase
            .from('card_transactions')
            .select('description, amount, category')
            .in('expense_id', creditExpenseIds)
            .order('amount', { ascending: false })
            .limit(20) // Pega os 20 maiores gastos do cartão
        cardTransactions = ct || []
    }

    const totalExpenses = expenses.data?.reduce((acc, curr) => acc + curr.value, 0) || 0
    const totalIncome = incomes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
    const balance = totalIncome - totalExpenses

    // 3. Montando o Prompt Rico
    const prompt = `
      Você é o "Bleu IA", um consultor financeiro pessoal.
      Usuário: ${userData.data?.full_name || 'Cliente'}.
      
      RESUMO DO MÊS:
      - Receitas: R$ ${totalIncome.toFixed(2)}
      - Despesas Totais: R$ ${totalExpenses.toFixed(2)}
      - Saldo: R$ ${balance.toFixed(2)}
      
      DETALHAMENTO:
      1. Gastos Gerais (Contas): ${JSON.stringify(expenses.data?.filter(e => !e.is_credit_card).slice(0,5))}
      2. FATURA DO CARTÃO (Itens individuais): ${JSON.stringify(cardTransactions)}

      INSTRUÇÕES:
      - Analise item por item. Se houver gastos supérfluos no cartão (ex: Uber, iFood, Streaming), cite-os nominalmente.
      - Se o usuário estiver gastando muito em uma categoria específica do cartão, alerte.
      - Dê uma dica final de investimento para o saldo (se positivo) ou de corte (se negativo).
      - Use Markdown com títulos e bullet points. Seja direto.
    `

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      prompt: prompt,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()

  } catch (error: any) {
    console.error("Erro API Route:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}