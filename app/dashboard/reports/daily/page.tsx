import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { 
  Calendar,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users
} from "lucide-react"
import Link from "next/link"

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const selectedDate = params.date || today

  // Get payments for the day
  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      client:clients(full_name),
      loan:loans(daily_installment)
    `)
    .eq("payment_date", selectedDate)
    .order("created_at", { ascending: false })

  // Get installments due today
  const { data: dueInstallments } = await supabase
    .from("installments")
    .select(`
      *,
      loan:loans!inner(
        client:clients(full_name)
      )
    `)
    .eq("due_date", selectedDate)

  // Get cash transactions
  const { data: cashTransactions } = await supabase
    .from("cash_transactions")
    .select("*")
    .eq("transaction_date", selectedDate)

  // Get new loans today
  const { data: newLoans } = await supabase
    .from("loans")
    .select(`
      *,
      client:clients(full_name)
    `)
    .gte("created_at", `${selectedDate}T00:00:00`)
    .lte("created_at", `${selectedDate}T23:59:59`)

  // Calculate metrics
  const totalCollected = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const paymentCount = payments?.length || 0

  const paidInstallments = dueInstallments?.filter(i => i.status === "paid").length || 0
  const partialInstallments = dueInstallments?.filter(i => i.status === "partial").length || 0
  const pendingInstallments = dueInstallments?.filter(i => i.status === "pending" || i.status === "overdue").length || 0
  const totalDue = dueInstallments?.length || 0

  const expectedCollection = dueInstallments?.reduce((sum, i) => sum + Number(i.amount_due), 0) || 0
  const collectionRate = expectedCollection > 0 ? (totalCollected / expectedCollection) * 100 : 0

  const income = cashTransactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const expenses = cashTransactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  
  const totalDisbursed = newLoans?.reduce((sum, l) => sum + Number(l.principal_amount), 0) || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reports">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Reporte Diario</h1>
          <p className="text-sm text-muted-foreground">
            Cierre del día {formatDate(selectedDate)}
          </p>
        </div>
      </div>

      {/* Date Selector */}
      <form className="flex gap-2" action="/dashboard/reports/daily">
        <Input
          name="date"
          type="date"
          defaultValue={selectedDate}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          <Calendar className="h-4 w-4 mr-2" />
          Ver
        </Button>
      </form>

      {/* Collection Summary */}
      <Card className="bg-success/5 border-success/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            Cobranza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-success">{formatCurrency(totalCollected)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {paymentCount} pago{paymentCount !== 1 ? "s" : ""} registrado{paymentCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Collection Rate */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Tasa de cobro</span>
              <span className="font-semibold">{collectionRate.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  collectionRate >= 80 ? "bg-success" : collectionRate >= 50 ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Esperado: {formatCurrency(expectedCollection)}
            </p>
          </div>

          {/* Installments Status */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="h-4 w-4 mx-auto text-success mb-1" />
              <p className="text-lg font-bold text-success">{paidInstallments}</p>
              <p className="text-[10px] text-muted-foreground">Pagadas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-warning/10">
              <Clock className="h-4 w-4 mx-auto text-warning-foreground mb-1" />
              <p className="text-lg font-bold">{partialInstallments}</p>
              <p className="text-[10px] text-muted-foreground">Parciales</p>
            </div>
            <div className={cn(
              "text-center p-2 rounded-lg",
              pendingInstallments > 0 ? "bg-destructive/10" : "bg-muted"
            )}>
              <AlertCircle className={cn(
                "h-4 w-4 mx-auto mb-1",
                pendingInstallments > 0 ? "text-destructive" : "text-muted-foreground"
              )} />
              <p className={cn("text-lg font-bold", pendingInstallments > 0 && "text-destructive")}>
                {pendingInstallments}
              </p>
              <p className="text-[10px] text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Movimientos de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-success/10 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-success mb-1" />
              <p className="text-lg font-bold text-success">{formatCurrency(income)}</p>
              <p className="text-xs text-muted-foreground">Ingresos</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
              <p className="text-lg font-bold text-destructive">{formatCurrency(expenses)}</p>
              <p className="text-xs text-muted-foreground">Gastos</p>
            </div>
          </div>

          <div className="mt-3 p-3 rounded-lg border-2 border-dashed text-center">
            <p className="text-sm text-muted-foreground">Balance del Día</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              income - expenses >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(income - expenses)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* New Loans */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Préstamos Otorgados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!newLoans || newLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se otorgaron préstamos hoy
            </p>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalDisbursed)}</p>
                <p className="text-xs text-muted-foreground">
                  {newLoans.length} préstamo{newLoans.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="divide-y">
                {newLoans.map((loan: any) => (
                  <div key={loan.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{loan.client?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.total_installments} cuotas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(loan.principal_amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        +{loan.interest_rate}% int.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalle de Cobros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!payments || payments.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No hay cobros registrados
            </div>
          ) : (
            <div className="divide-y max-h-64 overflow-auto">
              {payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{payment.client?.full_name}</p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-success">
                    +{formatCurrency(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
