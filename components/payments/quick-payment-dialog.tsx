"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { CheckCircle2, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { Installment } from "@/lib/types/database"

interface QuickPaymentDialogProps {
  installment: Installment | null
  loanId: string
  clientId: string
  collectorId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickPaymentDialog({
  installment,
  loanId,
  clientId,
  collectorId,
  open,
  onOpenChange,
}: QuickPaymentDialogProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!installment) return null

  const amountDue = Number(installment.amount_due) - Number(installment.amount_paid || 0)

  async function handlePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get("amount"))
    const notes = formData.get("notes") as string

    if (!amount || amount <= 0) {
      setError("Ingresa un monto válido")
      setIsLoading(false)
      return
    }

    try {
      // Create payment
      const { error: paymentError } = await supabase.from("payments").insert({
        installment_id: installment.id,
        loan_id: loanId,
        client_id: clientId,
        collector_id: collectorId,
        amount,
        payment_date: new Date().toISOString().split("T")[0],
        notes: notes || null,
      })

      if (paymentError) throw paymentError

      // Record cash transaction
      await supabase.from("cash_transactions").insert({
        type: "income",
        category: "payment",
        amount,
        description: `Cobro cuota #${installment.installment_number}`,
        reference_id: installment.id,
        collector_id: collectorId,
        transaction_date: new Date().toISOString().split("T")[0],
      })

      setIsSuccess(true)
      
      // Close after showing success
      setTimeout(() => {
        setIsSuccess(false)
        onOpenChange(false)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Error al registrar el pago")
    } finally {
      setIsLoading(false)
    }
  }

  function handlePayFullAmount() {
    const input = document.getElementById("payment-amount") as HTMLInputElement
    if (input) {
      input.value = amountDue.toString()
    }
  }

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[340px]">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold">Pago Registrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              El pago se ha guardado correctamente
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Cobrar Cuota #{installment.installment_number}
          </DialogTitle>
          <DialogDescription>
            Monto pendiente: {formatCurrency(amountDue)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePayment} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="payment-amount">Monto a Cobrar *</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="payment-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  max={amountDue}
                  defaultValue={amountDue}
                  required
                  className="text-lg font-semibold flex-1"
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={handlePayFullAmount}
                  className="shrink-0"
                >
                  Total
                </Button>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="payment-notes">Notas (opcional)</FieldLabel>
              <Textarea
                id="payment-notes"
                name="notes"
                placeholder="Observaciones del pago..."
                rows={2}
              />
            </Field>
          </FieldGroup>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
              disabled={isLoading}
            >
              {isLoading ? <Spinner className="mr-2" /> : null}
              Confirmar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
