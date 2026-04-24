import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ClientForm } from "@/components/clients/client-form"
import { ChevronLeft } from "lucide-react"

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !client) {
    notFound()
  }

  // Get current user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user?.id)
    .single()

  const isAdmin = profile?.role === "admin"

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Editar Cliente</h1>
          <p className="text-sm text-muted-foreground">
            {client.full_name}
          </p>
        </div>
      </div>

      {/* Form */}
      <ClientForm 
        client={client}
        collectors={collectors}
        isAdmin={isAdmin}
      />
    </div>
  )
}
