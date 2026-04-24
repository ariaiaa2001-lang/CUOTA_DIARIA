import { createClient } from "@/lib/supabase/server"
import { StatCard } from "@/components/dashboard/stat-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { PendingInstallments } from "@/components/dashboard/pending-installments"
import { DollarSign, Users, CreditCard, AlertTriangle, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/format"

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single()

  const isAdmin = profile?.role === "admin"

  // Fetch dashboard stats
  const [
    { count: totalClients },
    { count: activeLoans },
    { data: todayPayments },
    { data: pendingInstallmentsData },
    { count: overdueCount },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payments").select("amount").eq("payment_date", today),
    supabase
      .from("installments")
      .select(`
        id,
        amount_due,
        amount_paid,
        due_date,
        status,
        loan:loans!inner (
          id,
          client:clients!inner (
            id,
            full_name,
            photo_url
          )
        )
      `)
      .in("status", ["pending", "overdue", "partial"])
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
    supabase.from("installments").select("*", { count: "exact", head: true }).eq("status", "overdue"),
  ])

  // Calculate today's collections
  const todayCollected = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

  // Map pending installments for the component
  const pendingInstallments = (pendingInstallmentsData || []).map((item: any) => {
    const dueDate = new Date(item.due_date)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      id: item.id,
      client_name: item.loan?.client?.full_name || "Cliente",
      client_photo: item.loan?.client?.photo_url,
      loan_id: item.loan?.id,
      amount_due: Number(item.amount_due) - Number(item.amount_paid || 0),
      due_date: item.due_date,
      status: item.status as "pending" | "overdue" | "partial",
      days_overdue: diffDays > 0 ? diffDays : undefined,
    }
  })

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold">Buenos días</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("es-DO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Cobrado Hoy"
          value={formatCurrency(todayCollected)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Préstamos Activos"
          value={activeLoans || 0}
          icon={CreditCard}
          variant="primary"
        />
        <StatCard
          title="Clientes Activos"
          value={totalClients || 0}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Cuotas Vencidas"
          value={overdueCount || 0}
          icon={AlertTriangle}
          variant={overdueCount && overdueCount > 0 ? "destructive" : "default"}
        />
      </div>

      {/* Pending Installments */}
      <PendingInstallments installments={pendingInstallments} />
    </div>
  )
}
