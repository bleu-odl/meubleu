// lib/types.ts

// --- USUÁRIO ---
export interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  phone?: string
  avatar_url?: string
  plano: 'free' | 'premium'
  currency: string
  created_at: string
  updated_at: string
}

// --- CONTAS / CATEGORIAS ---
export interface Account {
  id: string
  user_id: string
  name: string
  color: string
  is_credit_card: boolean
  credit_limit?: number // <--- CAMPO NOVO (Opcional, pois contas normais não têm limite)
  order_index: number
  created_at?: string
}

// --- DESPESAS (Lançamentos) ---
export type ExpenseType = 'fixa' | 'variavel'
export type ExpenseStatus = 'pago' | 'pendente'

export interface Expense {
  id: string
  user_id: string
  name: string // Nome da conta/categoria
  value: number
  date: string // ISO Date string
  type: ExpenseType
  status: ExpenseStatus
  
  // Específico de Cartão de Crédito
  is_credit_card: boolean
  
  // Específico de Despesa Fixa/Recorrente
  is_fixed_value?: boolean
  recurrence_months?: number
  parent_id?: string // Para parcelas ou recorrências geradas
  
  created_at?: string
}

// Objeto para criação (sem ID)
export type CreateExpenseDTO = Omit<Expense, 'id' | 'created_at' | 'user_id'>

// --- TRANSAÇÕES DO CARTÃO (Detalhes da Fatura) ---
export interface CardTransaction {
  id: string
  expense_id: string // ID da "fatura" (Expense) pai
  description: string
  amount: number
  category: string // Categoria específica do gasto (ex: Alimentação)
  created_at: string
}

// --- RECEITAS ---
export interface Income {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  created_at?: string
}