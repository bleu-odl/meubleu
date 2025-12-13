'use client'

import AIFlashTips from '../../components/AIFlashTips'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, YAxis, Legend, Cell 
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, CalendarClock, Wallet, 
  AlertTriangle, ChevronDown, Lightbulb, Activity, Lock, 
  PieChart, ArrowLeft, Target, Zap, ChevronRight, CreditCard 
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useState, useEffect, useMemo, useTransition } from 'react'
import UpgradeModal from '../../components/UpgradeModal'
import { getAccountYearlyData } from '../actions/dashboard-data'

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i)
const categoryColors: Record<string, string> = { 'Alimentação': '#F97316', 'Transporte': '#3B82F6', 'Lazer': '#A855F7', 'Mercado': '#22C55E', 'Serviços': '#6B7280', 'Compras': '#EC4899', 'Saúde': '#EF4444', 'Outros': '#94A3B8' }
const colors = { red: '#f43f5e', green: '#10b981', yellow: '#f59e0b', indigo: '#6366f1', slate: '#3f3f46' }
const cardClass = "card relative p-5 flex flex-col justify-between h-44"
const iconBadgeClass = "absolute top-5 right-5 w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-indigo-400 border border-white/5"

interface DashboardProps {
  data: {
    currentMonthTotal: number
    percentageChange: number
    highestExpense: { name: string, value: number } | null
    nextDue: { name: string, date: string, value: number } | null
    totalIncome: number
    healthScore: number
    chartData: any[]
    topCategories: any[]
    ccCategoryData: any[]
    ccTotal: number
    ccTransactions: any[]
    accountNames: string[]
    totalCreditLimit: number
  }
  userProfile: { name: string, plan: string }
  selectedMonth: number
  selectedYear: number
}

export default function DashboardClient({ data, userProfile, selectedMonth, selectedYear }: DashboardProps) {
  const router = useRouter()
  
  const [chartFilter, setChartFilter] = useState('all')
  const [selectedAccount, setSelectedAccount] = useState(data.accountNames[0] || '')
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const [selectedCcCategory, setSelectedCcCategory] = useState<string | null>(null)

  const currentBalance = data.totalIncome - data.currentMonthTotal
  const isSpendingMore = data.percentageChange > 0

  // Se o usuário não definiu limite, usamos 0 para não mostrar dados falsos, 
  // ou mantemos um fallback visual se preferir, mas aqui vamos priorizar o dado real.
  const activeCreditLimit = data.totalCreditLimit > 0 ? data.totalCreditLimit : 0;
  
  useEffect(() => {
    if (selectedAccount) {
      startTransition(async () => {
        const chartData = await getAccountYearlyData(selectedYear, selectedAccount)
        setSpecificChartData(chartData)
      })
    }
  }, [selectedAccount, selectedYear])

  function handleFilterChange(month: number, year: number) {
    router.push(`/dashboard?month=${month}&year=${year}`)
  }

  const getGroupedTransactions = (category: string) => {
    const rawList = data.ccTransactions.filter(t => t.category === category)
    return rawList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear
  const dayCount = isCurrentMonth ? today.getDate() : daysInMonth
  const dailyAvg = data.ccTotal / (dayCount || 1)
  const projection = isCurrentMonth ? dailyAvg * daysInMonth : data.ccTotal

  // Cálculos visuais da barra de limite
  const limitUsedPercent = activeCreditLimit > 0 ? (data.ccTotal / activeCreditLimit) * 100 : 0
  const limitAvailable = activeCreditLimit - data.ccTotal
  let limitBarColor = 'bg-indigo-500'
  if (limitUsedPercent > 100) limitBarColor = 'bg-red-500'
  else if (limitUsedPercent > 80) limitBarColor = 'bg-yellow-500'

  const dynamicInsightText = useMemo(() => {
    if (selectedCcCategory) {
       const catVal = data.ccCategoryData.find(c => c.name === selectedCcCategory)?.value || 0
       const percent = data.ccTotal > 0 ? ((catVal / data.ccTotal) * 100).toFixed(1) : '0'
       return `Você gastou ${formatCurrency(catVal)} em ${selectedCcCategory}. Isso representa ${percent}% da sua fatura.`
    }
    
    if (projection > activeCreditLimit && activeCreditLimit > 0) return `Atenção: A projeção (${formatCurrency(projection)}) indica risco de estourar seu limite de ${formatCurrency(activeCreditLimit)}.`
    if (isCurrentMonth && projection > data.ccTotal * 1.2) return `Cuidado: O ritmo de gastos diários (${formatCurrency(dailyAvg)}) está alto para o início do mês.`
    
    return "Seus gastos parecem controlados. Nenhuma anomalia crítica detectada nesta fatura."
  }, [selectedCcCategory, projection, dailyAvg, data.ccTotal, data.ccCategoryData, activeCreditLimit, isCurrentMonth])

  let scoreTextColor = 'text-red-400', scoreLabel = 'Crítico', scoreDesc = 'Seus gastos estão excedendo sua renda.'
  if (data.healthScore >= 80) { scoreTextColor = 'text-indigo-400'; scoreLabel = 'Excelente'; scoreDesc = 'Parabéns! Você está poupando muito.' }
  else if (data.healthScore >= 50) { scoreTextColor = 'text-yellow-400'; scoreLabel = 'Atenção'; scoreDesc = 'Você está no limite.' }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Visão Geral</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            <p className="text-zinc-400 text-sm">Olá, <strong className="text-zinc-200">{userProfile.name}</strong></p>
            <span className="hidden sm:block text-zinc-600">•</span>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/10">
               <Lightbulb size={10} strokeWidth={3}/> {currentBalance < 0 ? 'Você gastou mais do que recebeu.' : 'Balanço positivo.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group cursor-help text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Score</span>
              <div className={`text-3xl font-bold ${scoreTextColor} leading-none flex items-center justify-end gap-2`}>
                  <Activity size={20} className="opacity-50" /> {data.healthScore}
              </div>
              
              <div className="absolute top-full right-0 mt-3 w-64 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none text-left">
                  <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase">Saúde Financeira</span>
                      <span className={`text-xs font-bold ${scoreTextColor}`}>{scoreLabel}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${data.healthScore >= 80 ? 'bg-indigo-500' : data.healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${data.healthScore}%` }}></div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{scoreDesc}</p>
              </div>
          </div>

          <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-lg p-1">
             <div className="relative">
                <select value={selectedMonth} onChange={(e) => handleFilterChange(parseInt(e.target.value), selectedYear)} className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-3 pr-2 cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900">
                  {monthNames.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                </select>
             </div>
             <div className="relative">
                <select value={selectedYear} onChange={(e) => handleFilterChange(selectedMonth, parseInt(e.target.value))} className="bg-transparent text-zinc-300 text-sm font-medium py-1.5 pl-2 pr-6 cursor-pointer hover:text-white outline-none [&>option]:bg-zinc-900">
                   {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
             </div>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={cardClass}>
          <div className="space-y-1"><p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Gastos do mês</p><h3 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(data.currentMonthTotal)}</h3></div>
          <div className={iconBadgeClass}><DollarSign size={18} strokeWidth={2} /></div>
          <div className="mt-auto pt-4 border-t border-white/5"><div className={`inline-flex items-center gap-1.5 text-xs font-medium ${isSpendingMore ? 'text-rose-400' : 'text-emerald-400'}`}>{isSpendingMore ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}{Math.abs(data.percentageChange).toFixed(1)}% <span className="text-zinc-500 font-normal">vs. mês anterior</span></div></div>
        </div>
        <div className={cardClass}>
          <div className="space-y-1"><p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Saldo Restante</p><h3 className={`text-2xl font-bold tracking-tight ${currentBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(currentBalance)}</h3></div>
          <div className={iconBadgeClass}><Wallet size={18} strokeWidth={2} /></div>
          <p className="text-[11px] text-zinc-500 mt-auto pt-4 border-t border-white/5 flex items-center gap-1">{currentBalance < 0 ? "Orçamento estourado" : "Dentro do orçamento"}</p>
        </div>
        <div className={cardClass}>
          <div className="w-full space-y-1"><p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Maior despesa</p>{data.highestExpense ? (<><h3 className="text-sm font-semibold text-zinc-200 truncate" title={data.highestExpense.name}>{data.highestExpense.name}</h3><p className="text-xl font-bold text-zinc-100">{formatCurrency(data.highestExpense.value)}</p></>) : <span className="text-sm text-zinc-600">--</span>}</div>
          <div className={iconBadgeClass}><AlertTriangle size={18} strokeWidth={2} /></div>
        </div>
        <div className={cardClass}>
          <div className="w-full space-y-1"><p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Próximo Vencimento</p>{data.nextDue ? (<><h3 className="text-sm font-semibold text-zinc-200 truncate" title={data.nextDue.name}>{data.nextDue.name}</h3><div className="flex items-baseline gap-2"><p className="text-xl font-bold text-indigo-400">{formatCurrency(data.nextDue.value)}</p></div><p className="text-[10px] text-zinc-500 mt-1">Dia {new Date(data.nextDue.date).getUTCDate()}</p></>) : <span className="text-xs font-bold text-emerald-500">Tudo pago!</span>}</div>
          <div className={iconBadgeClass}><CalendarClock size={18} strokeWidth={2} /></div>
        </div>
      </div>

      {/* GRÁFICO PRINCIPAL */}
      <div className="card h-[400px]">
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div><h3 className="text-base font-semibold text-white">Fluxo de Caixa</h3><p className="text-xs text-zinc-500">Receitas vs Despesas ({selectedYear})</p></div>
              <div className="bg-zinc-900 border border-white/5 p-0.5 rounded-lg flex">
                  {[{ key: 'all', label: 'Tudo' }, { key: 'income', label: 'Receitas' }, { key: 'expense', label: 'Despesas' }].map((filter) => (
                      <button key={filter.key} onClick={() => setChartFilter(filter.key)} className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all duration-200 ${chartFilter === filter.key ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>{filter.label}</button>
                  ))}
              </div>
          </div>
          <div className="h-full w-full pb-6">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chartData} margin={{ top: 5, right: 10, bottom: 30, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" /> 
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(value) => `${value/1000}k`} />
                      <Tooltip cursor={{ stroke: '#52525b', strokeWidth: 1 }} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(value: number) => [formatCurrency(value)]} />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}/>
                      {(chartFilter === 'all' || chartFilter === 'expense') && (<Line type="monotone" dataKey="expense" name="Despesas" stroke={colors.red} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.red }} />)}
                      {(chartFilter === 'all' || chartFilter === 'income') && (<Line type="monotone" dataKey="income" name="Receitas" stroke={colors.green} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colors.green }} />)}
                  </LineChart>
              </ResponsiveContainer>
          </div>
      </div>

      <AIFlashTips userPlan={userProfile.plan} />

      {/* CATEGORIAS E EVOLUÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card rounded-2xl">
            <div className="mb-6"><h3 className="text-base font-semibold text-white">Categorias</h3><p className="text-xs text-zinc-500">Top gastos do mês</p></div>
            <div className="space-y-4">
              {data.topCategories.length > 0 ? (data.topCategories.map((cat, index) => (
                <div key={index} className="group">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="font-medium text-zinc-300 truncate max-w-[150px]" title={cat.name}>{cat.name}</span>
                    <div className="text-right flex items-center gap-2"><span className="font-semibold text-white">{formatCurrency(cat.value)}</span><span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">{cat.percent.toFixed(0)}%</span></div>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${cat.percent}%`, backgroundColor: index === 0 ? '#6366F1' : index === 1 ? '#818CF8' : '#A5B4FC' }} /></div>
                </div>))) : ( <div className="flex h-[200px] items-center justify-center text-zinc-600 text-sm">Nenhum gasto neste mês.</div> )}
            </div>
          </div>
          
          <div className="card rounded-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div><h3 className="text-base font-semibold text-white">Evolução por Categoria</h3><p className="text-xs text-zinc-500">Histórico anual</p></div>
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="text-xs border-white/10 rounded-lg py-1.5 px-3 bg-zinc-800 text-zinc-300 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-700 outline-none">
                {data.accountNames.map(name => (<option key={name} value={name}>{name}</option>))}
              </select>
            </div>
            <div className="h-[250px] w-full relative">
              {isPending && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-indigo-500"></div>
                  </div>
              )}
              {specificChartData.length > 0 && selectedAccount ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={specificChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(value) => `${value}`} />
                    <Tooltip cursor={{ stroke: '#6366F1', strokeWidth: 1 }} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, selectedAccount]} />
                    <Line type="monotone" dataKey="value" stroke={colors.indigo} strokeWidth={2} dot={{ r: 3, fill: colors.indigo, strokeWidth: 2, stroke: "#18181b" }} activeDot={{ r: 5, fill: "#6366F1" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : ( 
                <div className="flex h-full items-center justify-center text-zinc-600 text-sm">Selecione uma categoria.</div> 
              )}
            </div>
          </div>
      </div>

      <div className="card rounded-2xl relative overflow-hidden flex flex-col md:flex-row min-h-[420px]">
        {userProfile.plan === 'free' && <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-6"><div className="bg-zinc-800 p-3 rounded-full mb-3"><Lock className="text-yellow-400" size={20} /></div><h3 className="text-base font-bold text-white">Painel de Fatura Pro</h3><p className="text-xs text-zinc-400 mb-4 max-w-xs">Desbloqueie análises de projeção, impacto por categoria e micro-insights.</p><button onClick={() => setShowUpgradeModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg shadow-indigo-900/20">Desbloquear Premium</button></div>}

        <div className="w-full md:w-[40%] bg-zinc-900/30 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col relative">
           <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                 <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center"><PieChart size={14} /></span>
                 Fatura Aberta
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 ml-10">Análise de impacto e projeção</p>
           </div>
           
           {/* --- NOVO: BARRA DE LIMITE VISUAL --- */}
           {activeCreditLimit > 0 && (
             <div className="mb-5 bg-zinc-950/50 p-3 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
               <div className="flex justify-between items-end mb-2">
                 <div>
                   <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Comprometido</span>
                   <span className="text-xs font-bold text-white flex items-center gap-1">
                      {limitUsedPercent.toFixed(1)}% <CreditCard size={10} className="text-zinc-600"/>
                   </span>
                 </div>
                 <div className="text-right">
                   <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Disponível</span>
                   <span className={`text-xs font-bold ${limitAvailable < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {formatCurrency(limitAvailable)}
                   </span>
                 </div>
               </div>
               
               {/* Barra de Progresso Animada */}
               <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                 <div 
                   className={`h-full rounded-full transition-all duration-700 ease-out ${limitBarColor}`}
                   style={{ width: `${Math.min(limitUsedPercent, 100)}%` }}
                 ></div>
               </div>
               
               <div className="text-right">
                  <span className="text-[9px] text-zinc-600">Limite Total: {formatCurrency(activeCreditLimit)}</span>
               </div>
             </div>
           )}

           <div className="h-[140px] w-full mb-4">
             {data.ccCategoryData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ccCategoryData.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }} width={70} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{ borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                      {data.ccCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#6366f1'} />)}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
             ) : <div className="h-full flex items-center justify-center text-xs text-zinc-600">Sem dados.</div>}
           </div>

           <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-white/5">
                 <span className="text-[9px] text-zinc-500 uppercase font-bold block mb-1">Média Diária</span>
                 <span className="text-xs font-bold text-white">{formatCurrency(dailyAvg)}</span>
              </div>
              <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-white/5 relative overflow-hidden">
                 <div className="absolute inset-0 bg-indigo-500/5"></div>
                 <span className="text-[9px] text-indigo-300 uppercase font-bold block mb-1 flex items-center gap-1">Projeção <Target size={8}/></span>
                 <span className="text-xs font-bold text-indigo-100">{formatCurrency(projection)}</span>
              </div>
           </div>

           <div className="mt-auto bg-zinc-800/20 border border-white/5 rounded-xl p-3 flex gap-3 items-start animate-in fade-in">
              <div className={`p-1.5 rounded-md shrink-0 ${selectedCcCategory ? 'bg-indigo-500/20 text-indigo-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                 {selectedCcCategory ? <Zap size={14}/> : <AlertTriangle size={14}/>}
              </div>
              <div>
                 <p className="text-[11px] text-zinc-300 leading-snug font-medium">
                    {dynamicInsightText}
                 </p>
              </div>
           </div>
        </div>

        <div className="flex-1 bg-zinc-950/20 relative flex flex-col">
           <div className="h-14 border-b border-white/5 flex items-center px-4 shrink-0">
              {selectedCcCategory ? (
                 <div className="flex items-center gap-2 w-full animate-in slide-in-from-left-2">
                    <button onClick={() => setSelectedCcCategory(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                       <ArrowLeft size={16}/>
                    </button>
                    <span className="text-sm font-bold text-white">{selectedCcCategory}</span>
                    <span className="ml-auto text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                       {data.ccCategoryData.find(c => c.name === selectedCcCategory)?.value 
                         ? formatCurrency(data.ccCategoryData.find(c => c.name === selectedCcCategory)!.value) 
                         : '-'}
                    </span>
                 </div>
              ) : (
                 <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Detalhamento por Categoria</span>
                    <span className="text-[10px] text-zinc-600 bg-zinc-900/50 px-2 py-1 rounded border border-white/5">
                       {data.ccCategoryData.length} categorias
                    </span>
                 </div>
              )}
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {selectedCcCategory ? (
                 <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                    {getGroupedTransactions(selectedCcCategory).map((t, i) => (
                       <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/40 border border-white/5 rounded-xl hover:bg-zinc-900/80 transition-colors">
                          <div className="flex flex-col gap-0.5">
                             <span className="text-xs font-medium text-zinc-200">{t.description}</span>
                             <span className="text-[10px] text-zinc-500">{formatDate(t.created_at)}</span>
                          </div>
                          <span className="text-xs font-bold text-white">{formatCurrency(t.amount)}</span>
                       </div>
                    ))}
                    {getGroupedTransactions(selectedCcCategory).length === 0 && (
                       <div className="text-center py-10 text-zinc-600 text-xs">Nenhuma transação encontrada.</div>
                    )}
                 </div>
              ) : (
                 <div className="space-y-1.5">
                    {data.ccCategoryData.map((cat) => (
                       <button 
                          key={cat.name}
                          onClick={() => setSelectedCcCategory(cat.name)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/30 border border-transparent hover:border-white/5 hover:bg-zinc-800/50 rounded-xl transition-all group"
                       >
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-8 rounded-full" style={{backgroundColor: categoryColors[cat.name] || '#71717a'}}></div>
                             <div className="text-left">
                                <p className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{cat.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                   <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-zinc-500 group-hover:bg-indigo-500 transition-colors" style={{width: `${data.ccTotal > 0 ? ((cat.value / data.ccTotal) * 100) : 0}%`}}></div>
                                   </div>
                                   <span className="text-[9px] text-zinc-500">{data.ccTotal > 0 ? ((cat.value / data.ccTotal) * 100).toFixed(0) : 0}%</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-bold text-zinc-400 group-hover:text-white">{formatCurrency(cat.value)}</span>
                             <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400"/>
                          </div>
                       </button>
                    ))}
                    {data.ccCategoryData.length === 0 && (
                       <div className="text-center py-10 text-zinc-600 text-xs">Nenhum gasto no cartão.</div>
                    )}
                 </div>
              )}
           </div>
        </div>
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}