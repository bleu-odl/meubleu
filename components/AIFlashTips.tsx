'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Sparkles, Lightbulb } from 'lucide-react'
import { generateFixedInsights } from '@/app/actions/generate-insights'
import { Skeleton } from './Skeleton'

export default function AIFlashTips({ userPlan }: { userPlan: string }) {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mesmo se não for premium, carregamos "vazio" para não pular a tela, 
    // ou removemos se preferir que usuário free não veja nem o espaço.
    // Aqui assumo que Premium vê.
    if (userPlan !== 'premium') {
        setLoading(false); return
    }
    
    generateFixedInsights()
      .then(data => setInsights(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [userPlan])

  if (userPlan !== 'premium') return null

  // SKELETON: Reserva o espaço exato para a tela não pular
  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
       {[1, 2, 3].map(i => (
         <div key={i} className="h-24 rounded-xl border border-white/5 bg-zinc-900/50 p-4 flex gap-4 items-center">
            <Skeleton className="h-10 w-10 rounded-lg bg-zinc-800" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24 bg-zinc-800" />
                <Skeleton className="h-3 w-full bg-zinc-800" />
            </div>
         </div>
       ))}
    </div>
  )

  if (insights.length === 0) return null

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'trending-up': return <TrendingUp size={18} />
      case 'trending-down': return <TrendingDown size={18} />
      case 'alert': return <AlertTriangle size={18} />
      case 'piggy-bank': return <PiggyBank size={18} />
      default: return <Lightbulb size={18} />
    }
  }

  // Cores mais discretas (apenas no ícone)
  const getIconStyle = (type: string) => {
    switch (type) {
      case 'warning': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      case 'positive': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'tip': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
      default: return 'text-zinc-400 bg-zinc-800 border-white/5'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-in fade-in duration-700">
      {insights.map((insight, idx) => (
        <div key={idx} className="group p-4 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/10 transition-all flex items-start gap-4 shadow-sm">
          <div className={`shrink-0 p-2.5 rounded-lg border ${getIconStyle(insight.type)}`}>
            {getIcon(insight.icon)}
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-200 mb-1">{insight.title}</h4>
            <p className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
              {insight.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}