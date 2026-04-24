"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

interface PendingInstallment {
  id: string
  client_name: string
  client_photo?: string
  loan_id: string
  amount_due: number
  due_date: string
  status: "pending" | "overdue" | "partial"
  days_overdue?: number
}

interface PendingInstallmentsProps {
  installments: PendingInstallment[]
  title?: string
  showViewAll?: boolean
}

const statusConfig = {
  pending: {
    label: "Hoy",
    variant: "outline" as const,
    icon: Clock,
  },
  overdue: {
    label: "Vencida",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
  partial: {
    label: "Parcial",
    variant: "secondary" as const,
    icon: Clock,
  },
}

export function PendingInstallments({
  installments,
  title = "Cuotas Pendientes Hoy",
  showViewAll = true,
}: PendingInstallmentsProps) {
  if (installments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium">Sin cuotas pendientes</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todas las cuotas del día han sido cobradas
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {showViewAll && (
          <Link href="/dashboard/payments">
            <Button variant="ghost" size="sm" className="text-xs h-8">
              Ver todas
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {installments.map((item) => {
            const config = statusConfig[item.status]
            const initials = item.client_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            return (
              <Link
                key={item.id}
                href={`/dashboard/payments/collect/${item.id}`}
                className="flex items-center gap-3 p-4 hover:bg-accent transition-colors touch-manipulation"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={item.client_photo} alt={item.client_name} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.client_name}</p>
                    <Badge variant={config.variant} className="text-[10px] h-5 px-1.5">
                      {item.status === "overdue" && item.days_overdue
                        ? `${item.days_overdue}d`
                        : config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cuota: {formatCurrency(item.amount_due)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className={cn(
                      "h-9 px-4 font-semibold",
                      item.status === "overdue"
                        ? "bg-destructive hover:bg-destructive/90"
                        : "bg-success hover:bg-success/90 text-success-foreground"
                    )}
                  >
                    Cobrar
                  </Button>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
