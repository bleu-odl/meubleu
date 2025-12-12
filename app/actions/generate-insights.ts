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

  const [expenses, incomes] = await Promise.all([
    supabase.from('expenses')
      .select('name, value, type')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth),
    supabase.from('incomes')
      .select('description, amount')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
  ])

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
      topExpenses: expenses.data?.sort((a, b) => b.value - a.value).slice(0, 5)
    }
  }

  const prompt = `
    Você é o "Bleu IA", um consultor financeiro pessoal.
    Dados do mês: ${JSON.stringify(contextData.financials)}
    
    Missão: Diagnóstico rápido, análise de gastos e dica de investimento.
    Seja breve e use Markdown.
  `

  // CORREÇÃO: Usando o modelo mais recente e estável
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
  
  // REMOVIDO A TRAVA DE PLANO TEMPORARIAMENTE PARA TESTES
  // const { data: userData } = await supabase.from('users').select('plano').eq('id', user.id).single()
  // if (userData?.plano !== 'premium') return [] 

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
    // CORREÇÃO: Usando o modelo mais recente e estável
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
      prompt: `Analise: ${JSON.stringify(expenses)}. Gere 3 insights curtos em PT-BR.`,
    })

    return object.insights
  } catch (error) {
    console.error("Erro na IA:", error)
    return []
  }
}