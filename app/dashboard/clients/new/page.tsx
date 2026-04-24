import { ClientForm } from "@/components/clients/client-form"
import { createClient } from "@/lib/supabase/server"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NewClientPage() {
  const supabase = await createClient()
  
  // Get current user to set as default collector
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user?.id)
    .single()

  // Get collectors list for admin
  const isAdmin = profile?.role === "admin"
  let collectors: { id: string; full_name: string }[] = []

  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name")
    collectors = data || []
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuevo Cliente</h1>
          <p className="text-sm text-muted-foreground">
            Registra un nuevo cliente
          </p>
        </div>
      </div>

      {/* Form */}
      <ClientForm 
        defaultCollectorId={profile?.id} 
        collectors={collectors}
        isAdmin={isAdmin}
      />
    </div>
  )
}
