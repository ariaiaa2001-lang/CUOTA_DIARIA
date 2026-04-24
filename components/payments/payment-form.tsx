"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { CheckCircle2, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { Installment } from "@/lib/types/database"

interface PaymentFormProps {
  installment: Installment
  loanId: string
  clientId: string
  collectorId?: string
  amountDue: number
}

export function PaymentForm({
  installment,
  loanId,
  clientId,
  collectorId,
  amountDue,
}: PaymentFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState<string>(amountDue.toString())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const paymentAmount = Number(formData.get("amount"))
    const notes = formData.get("notes") as string

    if (!paymentAmount || paymentAmount <= 0) {
      setError("Ingresa un monto válido")
      setIsLoading(false)
      return
    }

    try {
      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        installment_id: installment.id,
        loan_id: loanId,
        client_id: clientId,
        collector_id: collectorId,
        amount: paymentAmount,
        payment_date: new Date().toISOString().split("T")[0],
        notes: notes || null,
      })

      if (paymentError) throw paymentError

      // Record cash transaction (income from payment)
      await supabase.from("cash_transactions").insert({
        type: "income",
        category: "payment",
        amount: paymentAmount,
        description: `Cobro cuota #${installment.installment_number}`,
        reference_id: installment.id,
        collector_id: collectorId,
        transaction_date: new Date().toISOString().split("T")[0],
      })

      setIsSuccess(true)

      // Redirect after showing success
      setTimeout(() => {
        router.push("/dashboard/payments")
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Error al registrar el pago")
    } finally {
      setIsLoading(false)
    }
  }

  // Quick amount buttons
  const quickAmounts = [
    { label: "Total", value: amountDue },
    { label: "50%", value: amountDue / 2 },
    { label: formatCurrency(100), value: 100 },
    { label: formatCurrency(500), value: 500 },
  ].filter(q => q.value <= amountDue && q.value > 0)

  if (isSuccess) {
    return (
      <Card className="bg-success/10 border-success/20">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-xl font-bold text-success">Pago Exitoso</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Se ha registrado el pago de {formatCurrency(Number(amount))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Redirigiendo...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monto a Cobrar
              </FieldLabel>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="text-2xl font-bold h-14 text-center"
              />
            </Field>

            {/* Quick amount buttons */}
            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((q) => (
                <Button
                  key={q.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setAmount(q.value.toString())}
                >
                  {q.label}
                </Button>
              ))}
            </div>

            <Field>
              <FieldLabel htmlFor="notes">Notas (opcional)</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Observaciones del pago..."
                rows={2}
              />
            </Field>
          </FieldGroup>

          <Button
            type="submit"
            className="w-full h-12 text-lg bg-success hover:bg-success/90 text-success-foreground"
            disabled={isLoading || !amount || Number(amount) <= 0}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Confirmar Pago de {formatCurrency(Number(amount) || 0)}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
