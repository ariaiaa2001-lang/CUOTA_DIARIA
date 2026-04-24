import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { 
  BarChart3, 
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
  Users,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
  const defaultTo = today.toISOString().split("T")[0]
  
  const fromDate = params.from || defaultFrom
  const toDate = params.to || defaultTo

  // Get summary stats for the period
  const [
    { data: payments },
    { data: loans },
    { data: clients },
    { data: cashTransactions },
    { count: overdueCount },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, payment_date")
      .gte("payment_date", fromDate)
      .lte("payment_date", toDate),
    supabase
      .from("loans")
      .select("principal_amount, total_interest, status, created_at")
      .gte("created_at", `${fromDate}T00:00:00`)
      .lte("created_at", `${toDate}T23:59:59`),
    supabase
      .from("clients")
      .select("id, created_at")
      .gte("created_at", `${fromDate}T00:00:00`)
      .lte("created_at", `${toDate}T23:59:59`),
    supabase
      .from("cash_transactions")
      .select("type, amount, category")
      .gte("transaction_date", fromDate)
      .lte("transaction_date", toDate),
    supabase
      .from("installments")
      .select("*", { count: "exact", head: true })
      .eq("status", "overdue"),
  ])

  // Calculate metrics
  const totalCollected = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const totalDisbursed = loans?.reduce((sum, l) => sum + Number(l.principal_amount), 0) || 0
  const totalInterestGenerated = loans?.reduce((sum, l) => sum + Number(l.total_interest), 0) || 0
  const newLoans = loans?.length || 0
  const newClients = clients?.length || 0

  const income = cashTransactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const expenses = cashTransactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const netCashFlow = income - expenses

  // Group payments by date for chart-like summary
  const paymentsByDate = payments?.reduce((acc, p) => {
    const date = p.payment_date
    acc[date] = (acc[date] || 0) + Number(p.amount)
    return acc
  }, {} as Record<string, number>) || {}

  const sortedDates = Object.keys(paymentsByDate).sort().slice(-7)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Análisis y estadísticas del negocio
        </p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-3">
          <form className="flex items-center gap-2" action="/dashboard/reports">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                name="from"
                type="date"
                defaultValue={fromDate}
                className="h-8"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input
                name="to"
                type="date"
                defaultValue={toDate}
                className="h-8"
              />
            </div>
            <Button type="submit" size="sm" className="mt-4">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Cobrado</p>
                <p className="text-xl font-bold text-success mt-1">{formatCurrency(totalCollected)}</p>
              </div>
              <div className="p-2 rounded-lg bg-success/20">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Prestado</p>
                <p className="text-xl font-bold text-primary mt-1">{formatCurrency(totalDisbursed)}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/20">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Nuevos Préstamos</p>
                <p className="text-xl font-bold mt-1">{newLoans}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Nuevos Clientes</p>
                <p className="text-xl font-bold mt-1">{newClients}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Flujo de Caja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 mx-auto text-success mb-1" />
              <p className="text-sm font-bold text-success">{formatCurrency(income)}</p>
              <p className="text-[10px] text-muted-foreground">Ingresos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
              <p className="text-sm font-bold text-destructive">{formatCurrency(expenses)}</p>
              <p className="text-[10px] text-muted-foreground">Gastos</p>
            </div>
            <div className={cn(
              "text-center p-3 rounded-lg",
              netCashFlow >= 0 ? "bg-primary/10" : "bg-destructive/10"
            )}>
              <DollarSign className={cn(
                "h-4 w-4 mx-auto mb-1",
                netCashFlow >= 0 ? "text-primary" : "text-destructive"
              )} />
              <p className={cn(
                "text-sm font-bold",
                netCashFlow >= 0 ? "text-primary" : "text-destructive"
              )}>
                {formatCurrency(netCashFlow)}
              </p>
              <p className="text-[10px] text-muted-foreground">Neto</p>
            </div>
          </div>

          {/* Interest Generated */}
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Intereses Generados</p>
                <p className="text-lg font-bold text-warning-foreground">{formatCurrency(totalInterestGenerated)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                en {newLoans} préstamo{newLoans !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Alert */}
      {overdueCount && overdueCount > 0 && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">
                {overdueCount} cuota{overdueCount !== 1 ? "s" : ""} vencida{overdueCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Requieren atención inmediata
              </p>
            </div>
            <Link href="/dashboard/payments?status=overdue">
              <Button variant="outline" size="sm">
                Ver
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Collections Chart-like View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cobros Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay cobros en el período seleccionado
            </p>
          ) : (
            <div className="space-y-2">
              {sortedDates.map((date) => {
                const amount = paymentsByDate[date]
                const maxAmount = Math.max(...Object.values(paymentsByDate))
                const percentage = (amount / maxAmount) * 100

                return (
                  <div key={date} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      {formatDate(date, { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-24 text-right">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/reports/daily">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Reporte Diario</p>
                <p className="text-xs text-muted-foreground">Cierre del día</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/cash">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-sm">Ver Caja</p>
                <p className="text-xs text-muted-foreground">Transacciones</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
