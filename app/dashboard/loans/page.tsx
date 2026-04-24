import { createClient } from "@/lib/supabase/server"
import { LoansList } from "@/components/loans/loans-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("loans")
    .select(`
      *,
      client:clients!inner(id, full_name, photo_url, phone),
      collector:profiles!loans_collector_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false })

  if (params.q) {
    query = query.or(`client.full_name.ilike.%${params.q}%`, { referencedTable: "clients" })
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: loans, error } = await query

  // Calculate stats
  const totalActive = loans?.filter(l => l.status === "active").length || 0
  const totalAmount = loans?.reduce((sum, l) => sum + Number(l.principal_amount), 0) || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Préstamos</h1>
          <p className="text-sm text-muted-foreground">
            {totalActive} activo{totalActive !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/loans/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <LoansFilters initialQuery={params.q} initialStatus={params.status} />

      {/* Loans List */}
      <LoansList loans={loans || []} />
    </div>
  )
}

function LoansFilters({
  initialQuery,
  initialStatus,
}: {
  initialQuery?: string
  initialStatus?: string
}) {
  return (
    <form className="flex gap-2" action="/dashboard/loans">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Buscar por cliente..."
          defaultValue={initialQuery}
          className="pl-9"
        />
      </div>
      <select
        name="status"
        defaultValue={initialStatus || "all"}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="all">Todos</option>
        <option value="active">Activos</option>
        <option value="completed">Completados</option>
        <option value="defaulted">Impagos</option>
      </select>
      <Button type="submit" variant="secondary" size="sm">
        Filtrar
      </Button>
    </form>
  )
}
