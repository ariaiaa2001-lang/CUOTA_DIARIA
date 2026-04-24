import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Filter, 
  Plus, 
  TrendingDown, 
  TrendingUp,
  Wallet
} from "lucide-react"
import Link from "next/link"

const categoryLabels: Record<string, string> = {
  payment: "Cobro de cuota",
  loan_disbursement: "Desembolso",
  salary: "Salario",
  transport: "Transporte",
  office: "Oficina",
  other: "Otro",
}

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const selectedDate = params.date || today

  // Get transactions for the selected date
  let query = supabase
    .from("cash_transactions")
    .select(`
      *,
      collector:profiles!cash_transactions_collector_id_fkey(full_name)
    `)
    .eq("transaction_date", selectedDate)
    .order("created_at", { ascending: false })

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type)
  }

  const { data: transactions } = await query

  // Calculate totals
  const income = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const expenses = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const balance = income - expenses

  // Get week summary
  const weekStart = new Date(selectedDate)
  weekStart.setDate(weekStart.getDate() - 7)
  
  const { data: weekTransactions } = await supabase
    .from("cash_transactions")
    .select("type, amount")
    .gte("transaction_date", weekStart.toISOString().split("T")[0])
    .lte("transaction_date", selectedDate)

  const weekIncome = weekTransactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const weekExpenses = weekTransactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Caja</h1>
          <p className="text-sm text-muted-foreground">
            Control de ingresos y gastos
          </p>
        </div>
        <Link href="/dashboard/cash/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Registrar
          </Button>
        </Link>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-success mb-1" />
            <p className="text-lg font-bold text-success">{formatCurrency(income)}</p>
            <p className="text-[10px] text-muted-foreground">Ingresos</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold text-destructive">{formatCurrency(expenses)}</p>
            <p className="text-[10px] text-muted-foreground">Gastos</p>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-2",
          balance >= 0 ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"
        )}>
          <CardContent className="p-3 text-center">
            <Wallet className={cn("h-4 w-4 mx-auto mb-1", balance >= 0 ? "text-primary" : "text-destructive")} />
            <p className={cn("text-lg font-bold", balance >= 0 ? "text-primary" : "text-destructive")}>
              {formatCurrency(balance)}
            </p>
            <p className="text-[10px] text-muted-foreground">Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Week Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Últimos 7 días</p>
              <p className="text-lg font-bold">{formatCurrency(weekIncome - weekExpenses)}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-success">+{formatCurrency(weekIncome)}</p>
              <p className="text-destructive">-{formatCurrency(weekExpenses)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <form className="flex gap-2" action="/dashboard/cash">
        <Input
          name="date"
          type="date"
          defaultValue={selectedDate}
          className="flex-1"
        />
        <select
          name="type"
          defaultValue={params.type || "all"}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <Button type="submit" variant="secondary" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </form>

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Movimientos - {formatDate(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!transactions || transactions.length === 0 ? (
            <div className="p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Sin movimientos</p>
              <p className="text-xs text-muted-foreground mt-1">
                No hay transacciones registradas para esta fecha
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((transaction) => {
                const isIncome = transaction.type === "income"
                
                return (
                  <div key={transaction.id} className="flex items-center gap-3 p-4">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      isIncome ? "bg-success/10" : "bg-destructive/10"
                    )}>
                      {isIncome ? (
                        <ArrowDownCircle className="h-5 w-5 text-success" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {categoryLabels[transaction.category] || transaction.category}
                        </p>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {isIncome ? "Ingreso" : "Gasto"}
                        </Badge>
                      </div>
                      {transaction.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {transaction.description}
                        </p>
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-sm font-semibold shrink-0",
                      isIncome ? "text-success" : "text-destructive"
                    )}>
                      {isIncome ? "+" : "-"}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
