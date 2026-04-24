"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ChevronLeft, TrendingDown, TrendingUp, Save } from "lucide-react"
import { cn } from "@/lib/utils"

const expenseCategories = [
  { value: "salary", label: "Salario" },
  { value: "transport", label: "Transporte" },
  { value: "office", label: "Oficina" },
  { value: "other", label: "Otro" },
]

export default function NewCashTransactionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<"income" | "expense">("expense")

  const today = new Date().toISOString().split("T")[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get("amount"))
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const transactionDate = formData.get("transaction_date") as string

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const { error: insertError } = await supabase.from("cash_transactions").insert({
        type,
        category: type === "income" ? "other" : category,
        amount,
        description: description || null,
        collector_id: user?.id,
        transaction_date: transactionDate,
      })

      if (insertError) throw insertError

      router.push("/dashboard/cash")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al registrar la transacción")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/cash">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nueva Transacción</h1>
          <p className="text-sm text-muted-foreground">
            Registrar ingreso o gasto
          </p>
        </div>
      </div>

      {/* Type Selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-center",
            type === "income"
              ? "border-success bg-success/10"
              : "border-border hover:border-success/50"
          )}
        >
          <TrendingUp className={cn(
            "h-6 w-6 mx-auto mb-2",
            type === "income" ? "text-success" : "text-muted-foreground"
          )} />
          <p className={cn(
            "font-semibold",
            type === "income" ? "text-success" : "text-muted-foreground"
          )}>
            Ingreso
          </p>
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-center",
            type === "expense"
              ? "border-destructive bg-destructive/10"
              : "border-border hover:border-destructive/50"
          )}
        >
          <TrendingDown className={cn(
            "h-6 w-6 mx-auto mb-2",
            type === "expense" ? "text-destructive" : "text-muted-foreground"
          )} />
          <p className={cn(
            "font-semibold",
            type === "expense" ? "text-destructive" : "text-muted-foreground"
          )}>
            Gasto
          </p>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {type === "income" ? "Detalles del Ingreso" : "Detalles del Gasto"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="amount">Monto *</FieldLabel>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  required
                  className="text-2xl font-bold h-14 text-center"
                />
              </Field>

              {type === "expense" && (
                <Field>
                  <FieldLabel htmlFor="category">Categoría *</FieldLabel>
                  <select
                    id="category"
                    name="category"
                    required
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="transaction_date">Fecha *</FieldLabel>
                <Input
                  id="transaction_date"
                  name="transaction_date"
                  type="date"
                  required
                  defaultValue={today}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Descripción</FieldLabel>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detalle de la transacción..."
                  rows={2}
                />
              </Field>
            </FieldGroup>

            <Button 
              type="submit" 
              className={cn(
                "w-full",
                type === "income" 
                  ? "bg-success hover:bg-success/90 text-success-foreground"
                  : "bg-destructive hover:bg-destructive/90"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner className="mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Registrar {type === "income" ? "Ingreso" : "Gasto"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
