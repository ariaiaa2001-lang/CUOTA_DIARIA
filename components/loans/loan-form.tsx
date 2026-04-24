"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Calculator, DollarSign, Percent, Calendar, Save } from "lucide-react"
import { formatCurrency } from "@/lib/format"

interface LoanFormProps {
  clients: { id: string; full_name: string }[]
  collectors?: { id: string; full_name: string }[]
  defaultCollectorId?: string
  defaultClientId?: string
  isAdmin?: boolean
}

export function LoanForm({
  clients,
  collectors = [],
  defaultCollectorId,
  defaultClientId,
  isAdmin,
}: LoanFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form values for calculation preview
  const [principalAmount, setPrincipalAmount] = useState<number>(0)
  const [interestRate, setInterestRate] = useState<number>(20)
  const [totalInstallments, setTotalInstallments] = useState<number>(30)

  // Calculate loan details
  const loanCalc = useMemo(() => {
    if (!principalAmount || principalAmount <= 0) {
      return { totalInterest: 0, totalDebt: 0, dailyInstallment: 0 }
    }
    const totalInterest = (principalAmount * interestRate) / 100
    const totalDebt = principalAmount + totalInterest
    const dailyInstallment = totalDebt / totalInstallments
    return { totalInterest, totalDebt, dailyInstallment }
  }, [principalAmount, interestRate, totalInstallments])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const clientId = formData.get("client_id") as string
    const collectorId = formData.get("collector_id") as string || defaultCollectorId
    const startDate = formData.get("start_date") as string
    const notes = formData.get("notes") as string

    if (!clientId) {
      setError("Selecciona un cliente")
      setIsLoading(false)
      return
    }

    // Calculate end date
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + totalInstallments - 1)

    const loanData = {
      client_id: clientId,
      collector_id: collectorId,
      principal_amount: principalAmount,
      interest_rate: interestRate,
      total_interest: loanCalc.totalInterest,
      total_debt: loanCalc.totalDebt,
      total_installments: totalInstallments,
      daily_installment: Math.ceil(loanCalc.dailyInstallment * 100) / 100,
      start_date: startDate,
      end_date: end.toISOString().split("T")[0],
      notes: notes || null,
    }

    try {
      // Create loan
      const { data: loan, error: loanError } = await supabase
        .from("loans")
        .insert(loanData)
        .select()
        .single()

      if (loanError) throw loanError

      // Create installments
      const installments = []
      for (let i = 0; i < totalInstallments; i++) {
        const dueDate = new Date(start)
        dueDate.setDate(dueDate.getDate() + i)
        installments.push({
          loan_id: loan.id,
          installment_number: i + 1,
          due_date: dueDate.toISOString().split("T")[0],
          amount_due: Math.ceil(loanCalc.dailyInstallment * 100) / 100,
        })
      }

      const { error: installmentsError } = await supabase
        .from("installments")
        .insert(installments)

      if (installmentsError) throw installmentsError

      // Record cash transaction (loan disbursement)
      await supabase.from("cash_transactions").insert({
        type: "expense",
        category: "loan_disbursement",
        amount: principalAmount,
        description: `Desembolso préstamo - ${clients.find(c => c.id === clientId)?.full_name}`,
        reference_id: loan.id,
        collector_id: collectorId,
        transaction_date: startDate,
      })

      router.push(`/dashboard/loans/${loan.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al crear el préstamo")
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Client Selection */}
        <Card>
          <CardContent className="p-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="client_id">Cliente *</FieldLabel>
                <select
                  id="client_id"
                  name="client_id"
                  required
                  defaultValue={defaultClientId || ""}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
              </Field>

              {isAdmin && collectors.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="collector_id">Cobrador Asignado</FieldLabel>
                  <select
                    id="collector_id"
                    name="collector_id"
                    defaultValue={defaultCollectorId}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {collectors.map((collector) => (
                      <option key={collector.id} value={collector.id}>
                        {collector.full_name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Loan Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Detalles del Préstamo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="principal_amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monto a Prestar *
                </FieldLabel>
                <Input
                  id="principal_amount"
                  name="principal_amount"
                  type="number"
                  min="100"
                  step="100"
                  placeholder="10000"
                  required
                  value={principalAmount || ""}
                  onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                  className="text-lg font-semibold"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="interest_rate" className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Interés %
                  </FieldLabel>
                  <Input
                    id="interest_rate"
                    name="interest_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="total_installments">
                    Cuotas (días)
                  </FieldLabel>
                  <Input
                    id="total_installments"
                    name="total_installments"
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(Number(e.target.value))}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="start_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Inicio *
                </FieldLabel>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  required
                  defaultValue={today}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="notes">Notas</FieldLabel>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Observaciones del préstamo..."
                  rows={2}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Calculation Preview */}
        {principalAmount > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumen del Préstamo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Capital</p>
                  <p className="font-semibold">{formatCurrency(principalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Interés ({interestRate}%)</p>
                  <p className="font-semibold">{formatCurrency(loanCalc.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total a Pagar</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(loanCalc.totalDebt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cuota Diaria</p>
                  <p className="font-bold text-lg text-success">{formatCurrency(loanCalc.dailyInstallment)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isLoading || principalAmount <= 0}>
          {isLoading ? (
            <Spinner className="mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Crear Préstamo
        </Button>
      </div>
    </form>
  )
}
