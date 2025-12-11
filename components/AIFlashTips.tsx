'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Sparkles } from 'lucide-react'
import { generateFixedInsights } from '@/app/actions/generate-insights'
import { Skeleton } from './Skeleton'

export default function AIFlashTips({ userPlan }: { userPlan: string }) {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userPlan !== 'premium') {
        setLoading(false); return
    }
    
    // Chama a Server Action que você criou
    generateFixedInsights()
      .then(data => setInsights(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [userPlan])

  if (userPlan !== 'premium' || insights.length === 0) return null

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
       <Skeleton className="h-20 w-full rounded-xl" />
       <Skeleton className="h-20 w-full rounded-xl" />
       <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  )

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'trending-up': return <TrendingUp size={20} />
      case 'trending-down': return <TrendingDown size={20} />
      case 'alert': return <AlertTriangle size={20} />
      case 'piggy-bank': return <PiggyBank size={20} />
      default: return <Sparkles size={20} />
    }
  }

  const getColors = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-rose-500/10 border-rose-500/20 text-rose-400'
      case 'positive': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      case 'tip': return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      default: return 'bg-zinc-800/50 border-white/5 text-zinc-400'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-in slide-in-from-top-4 duration-700">
      {insights.map((insight, idx) => (
        <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${getColors(insight.type)}`}>
          <div className="shrink-0 mt-1">
            {getIcon(insight.icon)}
          </div>
          <div>
            <h4 className="font-bold text-sm mb-1">{insight.title}</h4>
            <p className="text-xs opacity-80 leading-relaxed">{insight.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}