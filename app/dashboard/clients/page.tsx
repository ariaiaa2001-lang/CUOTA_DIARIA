import { createClient } from "@/lib/supabase/server"
import { ClientsList } from "@/components/clients/clients-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 1. Consultamos los clientes. 
  // Traemos tanto 'name' como 'full_name' para evitar que la lista salga vacía.
  let query = supabase
    .from("clients")
    .select(`
      *,
      name,
      full_name,
      loans:loans(count),
      collector:profiles!clients_collector_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false })

  // 2. Filtros de búsqueda corregidos
  if (params.q) {
    // Buscamos en ambas columnas de nombre para que no importe cuál usó el formulario
    query = query.or(`full_name.ilike.%${params.q}%,name.ilike.%${params.q}%,id_number.ilike.%${params.q}%,phone.ilike.%${params.q}%`)
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: clients, error } = await query

  // 3. Formateo de datos "Salvavidas"
  // Si full_name es nulo, usamos el valor de name (que es donde se está guardando según tus capturas)
  const clientsWithStats = (clients || []).map((client: any) => ({
    ...client,
    display_name: client.full_name || client.name || "Sin nombre", 
    active_loans: client.loans?.[0]?.count || 0,
    collector_name: client.collector?.full_name || "Sin asignar",
  }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientsWithStats.length} cliente{clientsWithStats.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <ClientsFilters initialQuery={params.q} initialStatus={params.status} />

      {/* Clients List */}
      {/* Pasamos la lista procesada con display_name */}
      <ClientsList clients={clientsWithStats} />
    </div>
  )
}

function ClientsFilters({
  initialQuery,
  initialStatus,
}: {
  initialQuery?: string
  initialStatus?: string
}) {
  return (
    <form className="flex gap-2" action="/dashboard/clients">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Buscar cliente..."
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
        <option value="in_arrears">En mora</option>
        <option value="paid">Al día</option>
        <option value="inactive">Inactivos</option>
      </select>
      <Button type="submit" variant="secondary" size="sm">
        Filtrar
      </Button>
    </form>
  )
}
