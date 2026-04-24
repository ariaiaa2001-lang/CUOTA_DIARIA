import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Clock, AlertCircle, ChevronRight, Search, Filter } from "lucide-react"
import Link from "next/link"

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const selectedDate = params.date || today

  // Get pending installments for the selected date
  let query = supabase
    .from("installments")
    .select(`
      id,
      installment_number,
      amount_due,
      amount_paid,
      due_date,
      status,
      loan:loans!inner (
        id,
        daily_installment,
        client:clients!inner (
          id,
          full_name,
          photo_url,
          phone
        )
      )
    `)
    .lte("due_date", selectedDate)
    .order("due_date", { ascending: true })

  if (params.status === "overdue") {
    query = query.eq("status", "overdue")
  } else if (params.status === "pending") {
    query = query.in("status", ["pending", "partial"])
  } else {
    query = query.in("status", ["pending", "partial", "overdue"])
  }

  const { data: installments } = await query

  // Get today's payments summary
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("payment_date", today)

  const todayCollected = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const pendingCount = installments?.length || 0
  const overdueCount = installments?.filter(i => i.status === "overdue").length || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Cobranza</h1>
        <p className="text-sm text-muted-foreground">
          {pendingCount} cuota{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{formatCurrency(todayCollected)}</p>
            <p className="text-xs text-muted-foreground">Cobrado Hoy</p>
          </CardContent>
        </Card>
        <Card className={cn(overdueCount > 0 ? "bg-destructive/10 border-destructive/20" : "bg-muted")}>
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold", overdueCount > 0 ? "text-destructive" : "")}>
              {overdueCount}
            </p>
            <p className="text-xs text-muted-foreground">Cuotas Vencidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <form className="flex gap-2" action="/dashboard/payments">
        <Input
          name="date"
          type="date"
          defaultValue={selectedDate}
          className="flex-1"
        />
        <select
          name="status"
          defaultValue={params.status || "all"}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="overdue">Vencidas</option>
        </select>
        <Button type="submit" variant="secondary" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </form>

      {/* Installments List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Cuotas para cobrar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!installments || installments.length === 0 ? (
            <div className="p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium">Sin cuotas pendientes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Todas las cuotas han sido cobradas
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {installments.map((item: any) => {
                const client = item.loan?.client
                const remaining = Number(item.amount_due) - Number(item.amount_paid || 0)
                const isOverdue = item.status === "overdue"
                
                const initials = client?.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?"

                const dueDate = new Date(item.due_date)
                const todayDate = new Date(today)
                const diffDays = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/payments/collect/${item.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={client?.photo_url} alt={client?.full_name} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{client?.full_name}</p>
                        <Badge 
                          variant={isOverdue ? "destructive" : "outline"}
                          className="text-[10px] h-5 px-1.5"
                        >
                          {isOverdue ? (
                            <span className="flex items-center gap-0.5">
                              <AlertCircle className="h-3 w-3" />
                              {diffDays}d
                            </span>
                          ) : (
                            `#${item.installment_number}`
                          )}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.due_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(remaining)}</p>
                      </div>
                      <Button
                        size="sm"
                        className={cn(
                          "h-9 px-4",
                          isOverdue
                            ? "bg-destructive hover:bg-destructive/90"
                            : "bg-success hover:bg-success/90 text-success-foreground"
                        )}
                      >
                        Cobrar
                      </Button>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
