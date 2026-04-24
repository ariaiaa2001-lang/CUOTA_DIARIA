import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ChevronLeft, 
  Edit, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar,
  Plus,
  AlertCircle
} from "lucide-react"
import { formatCurrency, formatDate, formatPhoneNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const statusConfig = {
  active: { label: "Activo", className: "bg-success/10 text-success" },
  in_arrears: { label: "En mora", className: "bg-destructive/10 text-destructive" },
  paid: { label: "Al día", className: "bg-primary/10 text-primary" },
  inactive: { label: "Inactivo", className: "bg-muted text-muted-foreground" },
}

const loanStatusConfig = {
  active: { label: "Activo", className: "bg-success/10 text-success" },
  completed: { label: "Completado", className: "bg-primary/10 text-primary" },
  defaulted: { label: "Impago", className: "bg-destructive/10 text-destructive" },
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from("clients")
    .select(`
      *,
      collector:profiles!clients_collector_id_fkey(full_name)
    `)
    .eq("id", id)
    .single()

  if (error || !client) {
    notFound()
  }

  // Get client's loans
  const { data: loans } = await supabase
    .from("loans")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false })

  // Get recent payments
  const { data: recentPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(5)

  const initials = client.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const status = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.active

  // Calculate stats
  const activeLoans = loans?.filter(l => l.status === "active") || []
  const totalDebt = activeLoans.reduce((sum, l) => sum + (Number(l.total_debt) - Number(l.amount_paid)), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Detalle Cliente</h1>
        </div>
        <Link href={`/dashboard/clients/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Client Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={client.photo_url || undefined} alt={client.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{client.full_name}</h2>
                <Badge variant="outline" className={cn("text-xs", status.className)}>
                  {status.label}
                </Badge>
              </div>
              
              <div className="mt-2 space-y-1.5 text-sm">
                {client.id_number && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span>{client.id_number}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a 
                      href={`tel:${client.phone}`} 
                      className="text-primary hover:underline"
                    >
                      {formatPhoneNumber(client.phone)}
                    </a>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{client.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{activeLoans.length}</p>
              <p className="text-xs text-muted-foreground">Préstamos Activos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{formatCurrency(totalDebt)}</p>
              <p className="text-xs text-muted-foreground">Deuda Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans Section */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Préstamos</CardTitle>
          <Link href={`/dashboard/loans/new?client=${id}`}>
            <Button size="sm" className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" />
              Nuevo
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!loans || loans.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No tiene préstamos registrados
            </div>
          ) : (
            <div className="divide-y">
              {loans.map((loan) => {
                const loanStatus = loanStatusConfig[loan.status as keyof typeof loanStatusConfig]
                const remaining = Number(loan.total_debt) - Number(loan.amount_paid)
                const progress = (Number(loan.amount_paid) / Number(loan.total_debt)) * 100

                return (
                  <Link
                    key={loan.id}
                    href={`/dashboard/loans/${loan.id}`}
                    className="block p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {formatCurrency(loan.principal_amount)}
                          </p>
                          <Badge variant="outline" className={cn("text-[10px]", loanStatus.className)}>
                            {loanStatus.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Cuota: {formatCurrency(loan.daily_installment)} diario
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{formatCurrency(remaining)}</p>
                        <p className="text-[10px] text-muted-foreground">pendiente</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pagos Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!recentPayments || recentPayments.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No hay pagos registrados
            </div>
          ) : (
            <div className="divide-y">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                      <span className="text-success font-semibold text-sm">$</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {client.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
