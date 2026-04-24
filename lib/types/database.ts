export type UserRole = 'admin' | 'collector'

export type ClientStatus = 'active' | 'in_arrears' | 'paid' | 'inactive'

export type LoanStatus = 'active' | 'completed' | 'defaulted'

export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue'

export type TransactionType = 'income' | 'expense'

export type TransactionCategory = 'payment' | 'loan_disbursement' | 'salary' | 'transport' | 'office' | 'other'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  full_name: string
  id_number: string | null
  phone: string | null
  phone_secondary: string | null
  address: string | null
  photo_url: string | null
  notes: string | null
  status: ClientStatus
  collector_id: string | null
  created_at: string
  updated_at: string
  // Relations
  collector?: Profile
  loans?: Loan[]
}

export interface Loan {
  id: string
  client_id: string
  collector_id: string | null
  principal_amount: number
  interest_rate: number
  total_interest: number
  total_debt: number
  total_installments: number
  daily_installment: number
  amount_paid: number
  start_date: string
  end_date: string
  status: LoanStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  client?: Client
  collector?: Profile
  installments?: Installment[]
  payments?: Payment[]
}

export interface Installment {
  id: string
  loan_id: string
  installment_number: number
  due_date: string
  amount_due: number
  amount_paid: number
  status: InstallmentStatus
  paid_at: string | null
  created_at: string
  // Relations
  loan?: Loan
}

export interface Payment {
  id: string
  installment_id: string | null
  loan_id: string
  client_id: string
  collector_id: string | null
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
  // Relations
  installment?: Installment
  loan?: Loan
  client?: Client
  collector?: Profile
}

export interface CashTransaction {
  id: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  description: string | null
  reference_id: string | null
  collector_id: string | null
  transaction_date: string
  created_at: string
  // Relations
  collector?: Profile
}

// Dashboard Stats
export interface DashboardStats {
  totalClients: number
  activeLoans: number
  expectedToday: number
  collectedToday: number
  pendingToday: number
  overdueCount: number
  totalPortfolio: number
  collectionRate: number
}

// Payment with full relations for display
export interface PaymentWithRelations extends Payment {
  client: Client
  loan: Loan
  installment: Installment | null
}

// Today's collection item
export interface TodayCollectionItem {
  client: Client
  loan: Loan
  installment: Installment
  isPaid: boolean
}
