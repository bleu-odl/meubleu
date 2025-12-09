'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

// Tipos
type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextData {
  addToast: (message: string, type: ToastType) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Container de Toasts (Fixo no canto inferior direito) */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Componente Individual do Toast
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, 4000) // Some após 4 segundos

    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const icons = {
    success: <CheckCircle className="text-emerald-400" size={20} />,
    error: <AlertCircle className="text-rose-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />,
  }

  const borderColors = {
    success: 'border-emerald-500/20',
    error: 'border-rose-500/20',
    info: 'border-blue-500/20',
  }

  return (
    <div 
      className={`
        pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl 
        bg-[#18181b] border ${borderColors[toast.type]} 
        animate-in slide-in-from-right-full fade-in duration-300
      `}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-medium text-zinc-100 flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-zinc-500 hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  )
}

// Hook para usar em qualquer página
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de um ToastProvider')
  return context
}