'use server'

import { createClient } from '@/lib/supabase-server'
import { generateObject, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// --- FUNÇÃO 1: RELATÓRIO COMPLETO (STREAMING DE TEXTO) ---
// Usada pelo chat "Consultor IA" para análises profundas
export async function generateFinancialInsights() {
  const supabase = await createClient()
  
  // 1. Segurança: Verifica se é Premium
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

  // 2. Coleta de Dados do Mês Atual
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

  const [expenses, incomes] = await Promise.all([
    supabase.from('expenses')
      .select('name, value, type') // Simplificado para economizar tokens
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth),
    supabase.from('incomes')
      .select('description, amount')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
  ])

  // 3. Resumo Matemático para a IA
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
      topExpenses: expenses.data?.sort((a, b) => b.value - a.value).slice(0, 5) // Top 5 maiores gastos
    }
  }

  // 4. Prompt do "Consultor"
  const prompt = `
    Você é o "Bleu IA", um consultor financeiro pessoal direto e perspicaz.
    
    Dados do mês de ${contextData.month} de ${contextData.userName}:
    ${JSON.stringify(contextData.financials)}

    Sua missão:
    1. Dê um diagnóstico rápido da saúde financeira (Excelente, Atenção ou Crítico).
    2. Analise os maiores gastos e sugira onde cortar.
    3. Dê uma dica acionável de investimento ou economia baseada no saldo (${balance}).
    
    Estilo: Use Markdown. Seja breve. Use emojis com moderação. Fale diretamente com o usuário.
  `

  // 5. Gera o texto em tempo real
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    prompt: prompt,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}

// --- FUNÇÃO 2: FLASH TIPS (JSON ESTRUTURADO) ---
// Usada pelos cards fixos no topo do dashboard
export async function generateFixedInsights() {
  const supabase = await createClient()
  
  // 1. Segurança
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return [] // Retorna vazio se não logado
  
  const { data: userData } = await supabase.from('users').select('plano').eq('id', user.id).single()
  if (userData?.plano !== 'premium') return [] // Retorna vazio se for Free

  // 2. Coleta de Dados (Reutiliza lógica de data)
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

  const { data: expenses } = await supabase.from('expenses')
    .select('name, value, date')
    .eq('user_id', user.id)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  // Se não tiver dados suficientes, não gasta crédito da IA
  if (!expenses || expenses.length < 3) return []

  // 3. IA Gera JSON garantido pelo Zod
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      insights: z.array(z.object({
        title: z.string().describe("Título curto, ex: 'Alerta de Gastos'"),
        description: z.string().describe("Descrição de uma linha, max 60 caracteres"),
        type: z.enum(['positive', 'warning', 'neutral', 'tip']),
        icon: z.enum(['trending-up', 'trending-down', 'alert', 'piggy-bank'])
      })).length(3) // Força gerar exatamente 3 insights
    }),
    prompt: `
      Analise estas despesas recentes: ${JSON.stringify(expenses)}.
      Gere 3 insights rápidos:
      1. Um sobre tendência de gastos (ex: subiu/caiu).
      2. Um ponto de atenção específico (ex: gastou muito em X).
      3. Uma dica rápida ou previsão.
      Idioma: Português Brasil.
    `,
  })

  return object.insights
}