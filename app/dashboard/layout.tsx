import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { Header } from "@/components/navigation/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const userData = {
    full_name: profile?.full_name || user.email,
    email: user.email,
    avatar_url: profile?.avatar_url,
    role: profile?.role || "collector",
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={userData} />
      <main className="flex-1 pb-20 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
