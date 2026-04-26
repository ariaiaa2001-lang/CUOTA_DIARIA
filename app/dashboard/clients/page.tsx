import { createClient } from "@/lib/supabase/server"
import { ClientsList } from "@/components/clients/clients-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

// Forzamos a que no haya cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 1. Consulta básica primero para asegurar resultados
  // Solo traemos las columnas necesarias para evitar errores de relación
  let query = supabase
    .from("clients")
    .select("*") 
    .order("created_at", { ascending: false })

  // 2. Aplicar filtros solo si existen
  if (params.q) {
    // Usamos una búsqueda más simple para evitar errores si full_name es null
    query = query.or(`full_name.ilike.%${params.q}%,name.ilike.%${params.q}%,phone.ilike.%${params.q}%`)
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: clients, error } = await query

  // 3. Mapeo de datos con protecciones
  const clientsWithStats = (clients || []).map((client: any) => ({
    ...client,
    full_name: client.full_name || client.name || "Sin nombre",
    active_loans: 0, // Simplificado para probar
    collector_name: "Administrador",
  }))

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientsWithStats.length} cliente{clientsWithStats.length !== 1 ? "s" : ""} encontrados
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* BUSCADOR */}
      <form className="flex gap-2" action="/dashboard/clients">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Buscar por nombre, teléfono..."
            defaultValue={params.q}
            className="pl-9"
          />
        </div>
        <Button type="submit" size="sm">Buscar</Button>
      </form>

      {/* ÁREA DE DEPURACIÓN (Solo se ve si hay errores o no hay datos) */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs font-mono">
          <strong>Error de Supabase:</strong> {error.message}
        </div>
      )}

      {/* LISTADO */}
      {clientsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-gray-50">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">No se encontraron registros</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              Si ves datos en el Table Editor de Supabase pero aquí no, verifica que la URL del proyecto en el .env sea la correcta.
            </p>
            <div className="mt-6 flex gap-2 justify-center">
               <Link href="/dashboard/clients">
                <Button variant="outline" size="sm">Limpiar filtros</Button>
               </Link>
            </div>
          </div>
        </div>
      ) : (
        <ClientsList clients={clientsWithStats} />
      )}
      
      {/* DEBUG VISUAL: Quita esto cuando funcione */}
      <div className="mt-10 p-4 bg-slate-900 text-green-400 rounded-lg text-[10px] font-mono overflow-auto max-h-40">
        <p className="// text-white mb-2">--- Consola de Depuración ---</p>
        <pre>{JSON.stringify({ 
          count: clients?.length, 
          error,
          first_row: clients?.[0] 
        }, null, 2)}</pre>
      </div>
    </div>
  )
}
