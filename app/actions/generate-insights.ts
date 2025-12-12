'use server'

import { createClient } from '@/lib/supabase-server'
import { generateObject, streamText } from 'ai'
import { google } from '@ai-sdk/google' 
import { z } from 'zod'

export async function generateFinancialInsights() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: userData } = await supabase
    .from('users')
    .select('plano, full_name')
    .eq('id', user.id)
    .single()

  if (userData?.plano !== 'premium') {
    throw new Error('Recurso exclusivo para membros Premium.')
  }

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

  // CORREÇÃO: Adicionei 'id' na lista de campos do select abaixo
  const [expenses, incomes, cardTransactions] = await Promise.all([
    supabase.from('expenses')
      .select('id, name, value, type, is_credit_card') 
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth),
    supabase.from('incomes')
      .select('description, amount')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth),
    // A busca de card_transactions aqui pode ser removida ou mantida vazia
    // pois faremos a busca detalhada abaixo usando os IDs
    Promise.resolve({ data: [] }) 
  ])
  
  // Agora 'e.id' vai existir porque pedimos no select acima
  let creditDetails: any[] = []
  const creditExpenseIds = expenses.data?.filter(e => e.is_credit_card).map(e => e.id) || []
  
  if (creditExpenseIds.length > 0) {
      const { data: ct } = await supabase
        .from('card_transactions')
        .select('description, amount, category')
        .in('expense_id', creditExpenseIds)
        .order('amount', { ascending: false })
        .limit(15) 
      creditDetails = ct || []
  }

  const totalExpenses = expenses.data?.reduce((acc, curr) => acc + curr.value, 0) || 0
  const totalIncome = incomes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
  const balance = totalIncome - totalExpenses

  const contextData = {
    userName: userData.full_name?.split(' ')[0] || 'Usuário',
    month: today.toLocaleString('pt-BR', { month: 'long' }),
    financials: {
      income: totalIncome,
      expenses: totalExpenses,
      balance: balance,
      topGeneralExpenses: expenses.data?.filter(e => !e.is_credit_card).sort((a, b) => b.value - a.value).slice(0, 5),
      creditCardDetails: creditDetails.length > 0 ? creditDetails : "Sem dados detalhados de cartão."
    }
  }

  const prompt = `
    Atue como um analista financeiro pessoal sênior. O tom deve ser profissional, mas próximo.
    
    PERFIL DO CLIENTE:
    Nome: ${contextData.userName}
    Mês: ${contextData.month}
    
    DADOS FINANCEIROS:
    - Receita Total: R$ ${contextData.financials.income}
    - Despesa Total: R$ ${contextData.financials.expenses}
    - Saldo: R$ ${contextData.financials.balance}
    
    DETALHE DE GASTOS:
    1. Contas Fixas/Débito (Top 5): ${JSON.stringify(contextData.financials.topGeneralExpenses)}
    2. Fatura do Cartão (Itens Específicos): ${JSON.stringify(contextData.financials.creditCardDetails)}

    SUA MISSÃO:
    Analise os dados e gere uma resposta em MARKDOWN com a seguinte estrutura:

    ### 📊 Diagnóstico
    Um parágrafo curto sobre a saúde financeira. Se o saldo for negativo, seja direto.

    ### 💳 Análise de Gastos
    Cite NOMES REAIS das transações onde o dinheiro está indo. 
    Exemplo: "Notei gastos recorrentes com Uber e iFood no cartão..." ou "A conta de luz está alta...".
    Se houver gastos fúteis no cartão, aponte.

    ### 💡 Plano de Ação
    2 ou 3 bullet points práticos para o próximo mês.

    IMPORTANTE: Não invente dados. Use os JSONs fornecidos.
  `

  const result = await streamText({
    model: google('gemini-2.5-flash'),
    prompt: prompt,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}

export async function generateFixedInsights() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

  const { data: expenses } = await supabase.from('expenses')
    .select('name, value, date')
    .eq('user_id', user.id)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  if (!expenses || expenses.length < 1) return []

  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        insights: z.array(z.object({
          title: z.string(),
          description: z.string(),
          type: z.enum(['positive', 'warning', 'neutral', 'tip']),
          icon: z.enum(['trending-up', 'trending-down', 'alert', 'piggy-bank'])
        })).length(3)
      }),
      prompt: `
        Analise estas despesas: ${JSON.stringify(expenses)}.
        Gere 3 insights extremamente curtos e diretos (max 10 palavras na descrição).
        Evite o óbvio.
        Idioma: PT-BR.
      `,
    })

    return object.insights
  } catch (error) {
    console.error("Erro na IA:", error)
    return []
  }
}