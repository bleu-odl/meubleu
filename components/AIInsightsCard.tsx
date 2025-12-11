'use client'

import { useState } from 'react'
import { Sparkles, Lock, Bot } from 'lucide-react'
import { useCompletion } from 'ai'
import ReactMarkdown from 'react-markdown' // Se der erro, remova e use <p>{completion}</p>

interface AIInsightsCardProps {
  userPlan: string
}

export default function AIInsightsCard({ userPlan }: AIInsightsCardProps) {
  const isPremium = userPlan === 'premium'
  const [hasStarted, setHasStarted] = useState(false)

  // Conecta com a API que criamos no Passo 1
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/chat-insights',
  })

  async function handleGenerate() {
    if (!isPremium) return
    setHasStarted(true)
    await complete('') 
  }

  return (
    <div className="card relative overflow-hidden group min-h-[250px] flex flex-col border border-indigo-500/20">
      
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-1000"></div>

      <div className="relative z-10 flex items-center justify-between mb-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot size={20} />
          </div>
          <div>
             <h3 className="font-bold text-white text-base">Consultor Inteligente</h3>
             <p className="text-xs text-zinc-500">Análise profunda do mês</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1">
        {!isPremium ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-4 py-8">
            <div className="p-3 bg-zinc-800 rounded-full text-yellow-500 mb-2 ring-1 ring-yellow-500/50">
              <Lock size={20} />
            </div>
            <h4 className="text-zinc-200 font-semibold text-sm">Recurso Premium</h4>
            <p className="text-xs text-zinc-500 max-w-[200px]">
              Libere análises detalhadas da sua saúde financeira com IA.
            </p>
          </div>
        ) : !hasStarted ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 py-8">
            <Sparkles className="text-indigo-400 mb-4 animate-pulse" size={28} />
            <p className="text-zinc-400 text-sm mb-6 max-w-sm">
              Nossa IA vai analisar todas as suas transações deste mês e gerar um relatório personalizado de estratégia.
            </p>
            <button 
              onClick={handleGenerate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Sparkles size={14} /> Gerar Análise Agora
            </button>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed animate-in fade-in h-full overflow-y-auto custom-scrollbar p-2">
            {completion ? (
               <div className="whitespace-pre-wrap font-medium text-sm">{completion}</div>
            ) : (
               <div className="flex items-center gap-2 text-zinc-500 italic text-xs animate-pulse">
                  <Bot size={14}/> Pensando...
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}