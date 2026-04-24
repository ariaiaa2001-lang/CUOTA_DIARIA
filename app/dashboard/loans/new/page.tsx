import { createClient } from "@/lib/supabase/server"
import { LoanForm } from "@/components/loans/loan-form"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NewLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user?.id)
    .single()

  const isAdmin = profile?.role === "admin"

  // Get clients list
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name")

  // Get collectors list for admin
  let collectors: { id: string; full_name: string }[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name")
    collectors = data || []
  }

  // If client param, get selected client
  let selectedClient: { id: string; full_name: string } | null = null
  if (params.client) {
    const { data } = await supabase
      .from("clients")
      .select("id, full_name")
      .eq("id", params.client)
      .single()
    selectedClient = data
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/loans">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuevo Préstamo</h1>
          <p className="text-sm text-muted-foreground">
            {selectedClient ? `Para ${selectedClient.full_name}` : "Registra un nuevo préstamo"}
          </p>
        </div>
      </div>

      {/* Form */}
      <LoanForm 
        clients={clients || []}
        collectors={collectors}
        defaultCollectorId={profile?.id}
        defaultClientId={selectedClient?.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
