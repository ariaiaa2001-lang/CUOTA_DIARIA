"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/format"
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { QuickPaymentDialog } from "@/components/payments/quick-payment-dialog"
import type { Installment } from "@/lib/types/database"

interface InstallmentsListProps {
  installments: Installment[]
  loanId: string
  clientId: string
  collectorId?: string
}

const statusConfig = {
  paid: {
    label: "Pagada",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  pending: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-muted",
  },
  partial: {
    label: "Parcial",
    icon: Clock,
    className: "bg-warning/10 text-warning-foreground border-warning/20",
  },
  overdue: {
    label: "Vencida",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
}

export function InstallmentsList({ 
  installments, 
  loanId,
  clientId,
  collectorId 
}: InstallmentsListProps) {
  const [showAll, setShowAll] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null)

  // Show unpaid first, then show limited or all
  const sortedInstallments = [...installments].sort((a, b) => {
    // Unpaid statuses first
    const statusOrder = { overdue: 0, partial: 1, pending: 2, paid: 3 }
    const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
    if (statusDiff !== 0) return statusDiff
    // Then by date
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const displayInstallments = showAll ? sortedInstallments : sortedInstallments.slice(0, 5)
  const hasMore = sortedInstallments.length > 5

  return (
    <>
      <div className="divide-y">
        {displayInstallments.map((installment) => {
          const config = statusConfig[installment.status as keyof typeof statusConfig] || statusConfig.pending
          const Icon = config.icon
          const remaining = Number(installment.amount_due) - Number(installment.amount_paid || 0)
          const isPaid = installment.status === "paid"

          return (
            <div
              key={installment.id}
              className={cn(
                "flex items-center gap-3 p-3",
                isPaid && "opacity-60"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                config.className
              )}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Cuota #{installment.installment_number}
                  </span>
                  <Badge variant="outline" className={cn("text-[10px] h-5", config.className)}>
                    {config.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatDate(installment.due_date)}</span>
                  <span>•</span>
                  <span>{formatRelativeDate(installment.due_date)}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                {isPaid ? (
                  <p className="text-sm font-medium text-success">
                    {formatCurrency(installment.amount_due)}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold">{formatCurrency(remaining)}</p>
                    {installment.status === "partial" && (
                      <p className="text-[10px] text-muted-foreground">
                        de {formatCurrency(installment.amount_due)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {!isPaid && (
                <Button
                  size="sm"
                  className={cn(
                    "h-8 px-3 shrink-0",
                    installment.status === "overdue"
                      ? "bg-destructive hover:bg-destructive/90"
                      : "bg-success hover:bg-success/90 text-success-foreground"
                  )}
                  onClick={() => setSelectedInstallment(installment)}
                >
                  Cobrar
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver todas ({sortedInstallments.length})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Quick Payment Dialog */}
      <QuickPaymentDialog
        installment={selectedInstallment}
        loanId={loanId}
        clientId={clientId}
        collectorId={collectorId}
        open={!!selectedInstallment}
        onOpenChange={(open) => !open && setSelectedInstallment(null)}
      />
    </>
  )
}
