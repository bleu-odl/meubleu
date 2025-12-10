// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Helper para classes CSS (Tailwind)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatador de Moeda Padrão
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Formatador de Data Curta (ex: 25/12/2023)
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  // Adiciona 'T12:00:00' se for apenas YYYY-MM-DD para evitar problemas de timezone UTC
  const date = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}