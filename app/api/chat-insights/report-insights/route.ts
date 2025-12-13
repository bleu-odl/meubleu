import { createClient } from '@/lib/supabase-server'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export const maxDuration = 60;

export async function POST(req: Request) {
  console.log(">>> Iniciando geração de relatório (Report Insights)...");

  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log("Erro: Usuário não autenticado");
      return new Response('Unauthorized', { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('plano, full_name')
      .eq('id', user.id)
      .single()

    // Verifica se é premium (opcional: comente se quiser testar sem ser premium)
    if (userData?.plano !== 'premium') {
      console.log("Erro: Usuário não é premium");
      return new Response('Premium only', { status: 403 })
    }

    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

    console.log("Buscando dados no Supabase...");
    
    // Busca dados
    const [expenses, incomes] = await Promise.all([
      supabase.from('expenses')
        .select('id, name, value, is_credit_card') 
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

    console.log(`Dados processados. Receita: ${totalIncome}, Despesa: ${totalExpenses}`);

    const prompt = `
      Atue como um analista financeiro pessoal.
      
      DADOS DO USUÁRIO (${userData.full_name}):
      - Mês: ${today.toLocaleString('pt-BR', { month: 'long' })}
      - Receita: R$ ${totalIncome.toFixed(2)}
      - Despesas: R$ ${totalExpenses.toFixed(2)}
      - Saldo: R$ ${balance.toFixed(2)}
      
      PRINCIPAIS GASTOS:
      ${JSON.stringify(expenses.data?.slice(0, 10))}

      Gere um relatório curto em MARKDOWN:
      ### 📊 Diagnóstico
      Resumo da situação.
      ### 💳 Análise
      Onde o dinheiro está indo (cite nomes dos gastos).
      ### 💡 Dicas
      3 ações rápidas.
    `

    console.log("Enviando prompt para o Google Gemini...");

    // CORREÇÃO AQUI: O modelo correto é 'gemini-1.5-flash'
    const result = await streamText({
      model: google('gemini-1.5-flash'), 
      prompt: prompt,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
    
  } catch (error: any) {
    console.error("!!! ERRO CRÍTICO NA ROTA:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}