import Link from 'next/link'
import { Wallet, ArrowRight, BarChart3, ShieldCheck, Zap, CreditCard, LayoutDashboard } from 'lucide-react'

export default function LandingPage() {
  return (
    // Mantemos o fundo escuro padrão do layout
    <div className="min-h-screen flex flex-col">
      
      {/* --- NAVBAR --- */}
      <header className="border-b border-white/5 bg-[#1E1F2B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3 text-white font-bold text-xl">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Wallet size={20} strokeWidth={2.5} />
            </div>
            <span>Finance SaaS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              Entrar
            </Link>
            <Link 
              href="/login" 
              className="rounded-full bg-white text-[#1E1F2B] px-6 py-2.5 text-sm font-bold hover:bg-slate-200 transition-all shadow-lg shadow-white/10 active:scale-95"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <main className="flex-1">
        <section className="pt-32 pb-20 text-center px-4 relative overflow-hidden">
          
          {/* Glow de fundo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

          <div className="mx-auto max-w-4xl space-y-8 relative z-10">
            
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-300 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              A maneira moderna de controlar seu dinheiro
            </div>
            
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100 leading-tight">
              Suas finanças, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">simples e sob controle.</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-slate-400 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              Gerencie receitas, despesas e cartões de crédito em uma interface pensada para quem valoriza clareza e velocidade. Sem planilhas complexas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <Link 
                href="/login" 
                className="flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-bold text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
              >
                Criar Conta Grátis <ArrowRight size={20}/>
              </Link>
              <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-all active:scale-95">
                Ver Demonstração
              </button>
            </div>
          </div>
        </section>

        {/* --- FEATURES --- */}
        <section className="py-24 border-t border-white/5 bg-[#1E1F2B]/50">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 md:grid-cols-3">
              
              <div className="group p-8 rounded-3xl bg-[#23242f] border border-white/5 hover:border-indigo-500/30 transition-all hover:shadow-2xl hover:shadow-indigo-900/10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <Zap size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Lançamento Rápido</h3>
                <p className="text-slate-400 leading-relaxed">
                  Adicione gastos em segundos. Organize por categorias coloridas e saiba exatamente para onde vai seu dinheiro.
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-[#23242f] border border-white/5 hover:border-purple-500/30 transition-all hover:shadow-2xl hover:shadow-purple-900/10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <CreditCard size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Gestão de Cartões</h3>
                <p className="text-slate-400 leading-relaxed">
                  Controle suas faturas detalhadamente. Parcelamentos inteligentes que se distribuem automaticamente pelos meses.
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-[#23242f] border border-white/5 hover:border-emerald-500/30 transition-all hover:shadow-2xl hover:shadow-emerald-900/10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Gráficos Poderosos</h3>
                <p className="text-slate-400 leading-relaxed">
                  Visualize sua evolução mensal e anual. Entenda seus padrões de consumo com gráficos claros e diretos.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* --- RODAPÉ --- */}
      <footer className="border-t border-white/5 py-12 text-center bg-[#181924]">
        <div className="flex items-center justify-center gap-2 font-bold text-xl text-white mb-4">
            <Wallet size={24} className="text-indigo-500"/>
            <span>Finance SaaS</span>
        </div>
        <p className="text-sm text-slate-500">
          © 2025 Finance SaaS. Feito para você assumir o controle.
        </p>
      </footer>

    </div>
  )
}