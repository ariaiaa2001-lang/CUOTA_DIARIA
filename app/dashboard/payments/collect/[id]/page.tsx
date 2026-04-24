import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Phone, MapPin, Calendar, AlertCircle } from "lucide-react"
import { formatCurrency, formatDate, formatRelativeDate, formatPhoneNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PaymentForm } from "@/components/payments/payment-form"

const statusConfig = {
  pending: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  partial: { label: "Parcial", className: "bg-warning/10 text-warning-foreground" },
  overdue: { label: "Vencida", className: "bg-destructive/10 text-destructive" },
  paid: { label: "Pagada", className: "bg-success/10 text-success" },
}

export default async function CollectPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get installment with loan and client data
  const { data: installment, error } = await supabase
    .from("installments")
    .select(`
      *,
      loan:loans!inner (
        id,
        principal_amount,
        total_debt,
        amount_paid,
        daily_installment,
        client:clients!inner (
          id,
          full_name,
          photo_url,
          phone,
          phone_secondary,
          address
        ),
        collector_id
      )
    `)
    .eq("id", id)
    .single()

  if (error || !installment) {
    notFound()
  }

  // If already paid, redirect to loan detail
  if (installment.status === "paid") {
    redirect(`/dashboard/loans/${installment.loan.id}`)
  }

  const loan = installment.loan as any
  const client = loan.client

  const initials = client.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const status = statusConfig[installment.status as keyof typeof statusConfig]
  const remaining = Number(installment.amount_due) - Number(installment.amount_paid || 0)
  const loanRemaining = Number(loan.total_debt) - Number(loan.amount_paid)
  const loanProgress = (Number(loan.amount_paid) / Number(loan.total_debt)) * 100

  const dueDate = new Date(installment.due_date)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = diffDays > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Cobrar Cuota</h1>
          <p className="text-sm text-muted-foreground">
            Cuota #{installment.installment_number}
          </p>
        </div>
        <Badge variant="outline" className={cn("text-xs", status.className)}>
          {status.label}
        </Badge>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Cuota vencida hace {diffDays} día{diffDays !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Fecha de vencimiento: {formatDate(installment.due_date)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={client.photo_url || undefined} alt={client.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <Link 
                href={`/dashboard/clients/${client.id}`}
                className="text-lg font-bold hover:text-primary transition-colors"
              >
                {client.full_name}
              </Link>
              
              <div className="mt-2 space-y-1.5">
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {formatPhoneNumber(client.phone)}
                  </a>
                )}
                {client.phone_secondary && (
                  <a
                    href={`tel:${client.phone_secondary}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Phone className="h-3 w-3" />
                    {formatPhoneNumber(client.phone_secondary)}
                  </a>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{client.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installment Amount - Big Focus */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Monto a Cobrar</p>
          <p className="text-4xl font-bold text-primary">{formatCurrency(remaining)}</p>
          {installment.status === "partial" && (
            <p className="text-sm text-muted-foreground mt-2">
              Ya pagado: {formatCurrency(installment.amount_paid)} de {formatCurrency(installment.amount_due)}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Vence: {formatDate(installment.due_date)} ({formatRelativeDate(installment.due_date)})</span>
          </div>
        </CardContent>
      </Card>

      {/* Loan Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Progreso del Préstamo</span>
            <Link href={`/dashboard/loans/${loan.id}`} className="text-xs text-primary hover:underline">
              Ver detalle
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Pagado</span>
              <span className="font-medium">{loanProgress.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${loanProgress}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
              <p className="font-semibold">{formatCurrency(loanRemaining)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Préstamo</p>
              <p className="font-semibold">{formatCurrency(loan.total_debt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <PaymentForm
        installment={installment}
        loanId={loan.id}
        clientId={client.id}
        collectorId={loan.collector_id}
        amountDue={remaining}
      />
    </div>
  )
}
