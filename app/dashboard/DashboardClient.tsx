'use client'

import AIFlashTips from '../../components/AIFlashTips'
import AIInsightsCard from '../../components/AIInsightsCard'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, YAxis, Legend, Cell 
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, CalendarClock, Wallet, 
  AlertTriangle, 
  ChevronDown, ChevronUp, Lightbulb, Activity, Lock 
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import { useState, useEffect } from 'react'
import UpgradeModal from '../../components/UpgradeModal'

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const shortMonthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
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
    rawYearExpenses: any[]
  }
  userProfile: { name: string, plan: string }
  selectedMonth: number
  selectedYear: number
}

export default function DashboardClient({ data, userProfile, selectedMonth, selectedYear }: DashboardProps) {
  const router = useRouter()
  
  // Estados Locais
  const [chartFilter, setChartFilter] = useState('all')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState(data.accountNames[0] || '')
  const [specificChartData, setSpecificChartData] = useState<any[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const currentBalance = data.totalIncome - data.currentMonthTotal
  const isSpendingMore = data.percentageChange > 0

  // Efeito para calcular o gráfico específico quando a conta selecionada muda
  useEffect(() => {
    if (selectedAccount && data.rawYearExpenses.length > 0) {
      processSpecificChart(selectedAccount, data.rawYearExpenses)
    }
  }, [selectedAccount, data.rawYearExpenses])

  function processSpecificChart(accountName: string, allExpenses: any[]) {
    const tempMap = new Map()
     for (let i = 0; i < 12; i++) {
        const d = new Date(selectedYear, selectedMonth - 11 + i, 1)
        tempMap.set(`${d.getFullYear()}-${d.getMonth()}`, { name: shortMonthNames[d.getMonth()], value: 0 })
     }
     
     const getCompetenceKey = (dateStr: string) => {
        const d = new Date(dateStr)
        return `${d.getFullYear()}-${d.getMonth()}`
    }

     allExpenses.filter(e => e.name === accountName).forEach(exp => {
        const key = getCompetenceKey(exp.date)
        if (tempMap.has(key)) { 
            const c = tempMap.get(key); 
            c.value += exp.value; 
            tempMap.set(key, c) 
        }
     })
     setSpecificChartData(Array.from(tempMap.values()))
  }

  function handleFilterChange(month: number, year: number) {
    router.push(`/dashboard?month=${month}&year=${year}`)
  }

  const getGroupedTransactions = (category: string) => {
    const rawList = data.ccTransactions.filter(t => t.category === category)
    const groups = new Map<string, { description: string, total: number, count: number }>()

    rawList.forEach(t => {
        const key = t.description.trim()
        if (groups.has(key)) {
            const existing = groups.get(key)!
            existing.total += t.amount
            existing.count += 1
        } else {
            groups.set(key, { description: key, total: t.amount, count: 1 })
        }
    })
    return Array.from(groups.values()).sort((a, b) => b.total - a.total)
  }

  // Lógica visual do Score
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
          {/* TOOLTIP DO SCORE */}
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

      {/* --- 1. ÁREA DE INSIGHTS FIXOS --- */}
      <AIFlashTips userPlan={userProfile.plan} />

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
              <div><h3 className="text-base font-semibold text-white">Fluxo de Caixa</h3><p className="text-xs text-zinc-500">Receitas vs Despesas (12 meses)</p></div>
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
            <div className="h-[250px] w-full">
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

      {/* CARTÃO DE CRÉDITO */}
      <div className="card rounded-2xl relative">
        {userProfile.plan === 'free' && <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-white/5"><div className="bg-zinc-800 p-3 rounded-full mb-3"><Lock className="text-yellow-400" size={20} /></div><h3 className="text-base font-bold text-white">Análise Premium</h3><p className="text-xs text-zinc-400 mb-4">Visualize gastos detalhados do cartão.</p><button onClick={() => setShowUpgradeModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95">Upgrade</button></div>}
        <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center justify-center h-[250px]">
                {data.ccCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ccCategoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                      <XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#A1A1AA' }} width={80} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', background: '#18181b', color: '#fff', fontSize: '12px' }} formatter={(value: number) => [formatCurrency(value)]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>{data.ccCategoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#71717A'} />))}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="text-zinc-600 text-sm">Sem dados de cartão.</div>}
            </div>
            <div className="flex flex-col h-[250px]"> 
              <div className="shrink-0 p-5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 mb-4"><p className="text-xs text-indigo-300 font-medium mb-1 uppercase tracking-wider">Total Faturas</p><h3 className="text-2xl font-bold text-indigo-400">{formatCurrency(data.ccTotal)}</h3></div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {data.ccCategoryData.map((cat) => {
                  const isOpen = expandedCategory === cat.name;
                  return (
                    <div key={cat.name} className="border border-white/5 rounded-lg overflow-hidden bg-zinc-900/50 shrink-0">
                      <button onClick={() => setExpandedCategory(isOpen ? null : cat.name)} className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"><div className="flex items-center gap-3"><div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: categoryColors[cat.name] || '#71717A' }}></div><span className="text-xs font-bold text-zinc-200">{cat.name}</span></div><div className="flex items-center gap-3"><span className="text-xs text-zinc-400 font-medium">{formatCurrency(cat.value)}</span>{isOpen ? <ChevronUp size={14} className="text-zinc-500"/> : <ChevronDown size={14} className="text-zinc-500"/>}</div></button>
                      {isOpen && (
                        <div className="px-3 pb-3 animate-in slide-in-from-top-1 bg-black/20"><ul className="space-y-1 pt-2">{getGroupedTransactions(cat.name).map((group, idx) => (<li key={idx} className="py-1.5 flex items-center justify-between text-[11px] border-l-2 border-white/5 pl-2 ml-1 hover:bg-white/5 transition-all rounded-r"><div className="text-zinc-400 font-medium truncate max-w-[120px]" title={group.description}>{group.description}</div><div className="flex items-center gap-2">{group.count > 1 && (<span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 px-1 py-px rounded border border-indigo-500/10">{group.count}x</span>)}<div className="text-zinc-200 font-bold whitespace-nowrap">{formatCurrency(group.total)}</div></div></li>))}{getGroupedTransactions(cat.name).length === 0 && (<li className="py-2 text-center text-[10px] text-zinc-600">Vazio.</li>)}</ul></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
        </div>
      </div>

      {/* --- 2. ÁREA DO CONSULTOR IA --- */}
      <div className="grid grid-cols-1">
          <AIInsightsCard userPlan={userProfile.plan} />
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  )
}