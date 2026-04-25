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

  // 1. Simplificamos la consulta al máximo para asegurar que traiga datos
  // Quitamos temporalmente la relación compleja de profiles para debuggear
  let query = supabase
    .from("clients")
    .select(`
      *,
      loans:loans(count)
    `)
    .order("created_at", { ascending: false })

  if (params.q) {
    // Buscamos en todas las columnas posibles de nombre según tus capturas
    query = query.or(`full_name.ilike.%${params.q}%,name.ilike.%${params.q}%,phone.ilike.%${params.q}%`)
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: clients, error } = await query

  if (error) {
    console.error("Error cargando clientes:", error)
  }

  // 2. Mapeo de seguridad para que el componente siempre reciba un nombre
  const clientsWithStats = (clients || []).map((client: any) => ({
    ...client,
    // Prioridad de nombre para evitar celdas vacías
    full_name: client.full_name || client.name || "Cliente sin nombre",
    active_loans: client.loans?.[0]?.count || 0,
    collector_name: "Sin asignar", // Simplificado para que no bloquee la vista
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientsWithStats.length} cliente{clientsWithStats.length !== 1 ? "s" : ""} registrados
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      <ClientsFilters initialQuery={params.q} initialStatus={params.status} />

      {/* Si la lista sigue vacía, mostramos un mensaje de ayuda */}
      {clientsWithStats.length === 0 ? (
        <div className="p-8 text-center border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No se encontraron clientes en la base de datos.</p>
        </div>
      ) : (
        <ClientsList clients={clientsWithStats} />
      )}
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
        <option value="inactive">Inactivos</option>
      </select>
      <Button type="submit" variant="secondary" size="sm">
        Filtrar
      </Button>
    </form>
  )
}
