'use client'

import { X, Crown, Check } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
            <Crown className="text-yellow-400" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Recurso Premium</h2>
          <p className="text-gray-300 text-sm mt-1">Desbloqueie o controle total do seu cartão.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Check size={16} className="text-green-500" />
              <span>Detalhamento item a item da fatura</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Check size={16} className="text-green-500" />
              <span>Gráficos exclusivos de categorias</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Check size={16} className="text-green-500" />
              <span>Inteligência Artificial</span>
            </div>
          </div>

          <button 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
            onClick={() => alert("Aqui iria para o checkout!")}
          >
            Quero ser Premium
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}