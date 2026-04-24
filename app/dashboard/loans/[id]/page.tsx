import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ChevronLeft, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { InstallmentsList } from "@/components/loans/installments-list"

const statusConfig = {
  active: { label: "Activo", className: "bg-success/10 text-success" },
  completed: { label: "Completado", className: "bg-primary/10 text-primary" },
  defaulted: { label: "Impago", className: "bg-destructive/10 text-destructive" },
}

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: loan, error } = await supabase
    .from("loans")
    .select(`
      *,
      client:clients!inner(id, full_name, photo_url, phone, address),
      collector:profiles!loans_collector_id_fkey(full_name)
    `)
    .eq("id", id)
    .single()

  if (error || !loan) {
    notFound()
  }

  // Get installments
  const { data: installments } = await supabase
    .from("installments")
    .select("*")
    .eq("loan_id", id)
    .order("installment_number", { ascending: true })

  const client = loan.client as any
  const initials = client.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const status = statusConfig[loan.status as keyof typeof statusConfig] || statusConfig.active
  const remaining = Number(loan.total_debt) - Number(loan.amount_paid)
  const progress = (Number(loan.amount_paid) / Number(loan.total_debt)) * 100

  // Count installments by status
  const paidCount = installments?.filter(i => i.status === "paid").length || 0
  const overdueCount = installments?.filter(i => i.status === "overdue").length || 0
  const pendingCount = installments?.filter(i => i.status === "pending" || i.status === "partial").length || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/loans">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Detalle Préstamo</h1>
        </div>
        <Badge variant="outline" className={cn("text-xs", status.className)}>
          {status.label}
        </Badge>
      </div>

      {/* Client Card */}
      <Card>
        <CardContent className="p-4">
          <Link 
            href={`/dashboard/clients/${client.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={client.photo_url || undefined} alt={client.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{client.full_name}</p>
              {client.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {client.phone}
                </p>
              )}
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Loan Summary */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progreso de pago</span>
              <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  loan.status === "completed" ? "bg-primary" : "bg-success"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Capital</p>
              <p className="text-lg font-bold">{formatCurrency(loan.principal_amount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Interés ({loan.interest_rate}%)</p>
              <p className="text-lg font-bold">{formatCurrency(loan.total_interest)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground">Total a Pagar</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(loan.total_debt)}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <p className="text-xs text-muted-foreground">Pagado</p>
              <p className="text-lg font-bold text-success">{formatCurrency(loan.amount_paid)}</p>
            </div>
          </div>

          {/* Remaining */}
          <div className="p-4 rounded-lg bg-card border-2 border-dashed text-center">
            <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(remaining)}</p>
          </div>

          {/* Dates */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Inicio: {formatDate(loan.start_date)}</span>
            </div>
            <div className="text-muted-foreground">
              Fin: {formatDate(loan.end_date)}
            </div>
          </div>

          {/* Daily Installment */}
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
            <p className="text-xs text-muted-foreground">Cuota Diaria</p>
            <p className="text-xl font-bold text-success">{formatCurrency(loan.daily_installment)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Installments Status Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-success" />
            <p className="text-lg font-bold mt-1">{paidCount}</p>
            <p className="text-[10px] text-muted-foreground">Pagadas</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/10 border-warning/20">
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-warning-foreground" />
            <p className="text-lg font-bold mt-1">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card className={cn(
          overdueCount > 0 ? "bg-destructive/10 border-destructive/20" : "bg-muted"
        )}>
          <CardContent className="p-3 text-center">
            <AlertCircle className={cn("h-5 w-5 mx-auto", overdueCount > 0 ? "text-destructive" : "text-muted-foreground")} />
            <p className="text-lg font-bold mt-1">{overdueCount}</p>
            <p className="text-[10px] text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Installments List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cuotas ({loan.total_installments})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InstallmentsList 
            installments={installments || []} 
            loanId={loan.id}
            clientId={client.id}
            collectorId={loan.collector_id}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {loan.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {loan.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
