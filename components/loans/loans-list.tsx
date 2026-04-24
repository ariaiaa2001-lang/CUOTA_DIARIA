"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Loan } from "@/lib/types/database"

interface LoanWithRelations extends Loan {
  client: {
    id: string
    full_name: string
    photo_url?: string
    phone?: string
  }
  collector?: {
    full_name: string
  }
}

interface LoansListProps {
  loans: LoanWithRelations[]
}

const statusConfig = {
  active: {
    label: "Activo",
    className: "bg-success/10 text-success border-success/20",
  },
  completed: {
    label: "Completado",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  defaulted: {
    label: "Impago",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
}

export function LoansList({ loans }: LoansListProps) {
  if (loans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-sm font-medium">No hay préstamos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crea tu primer préstamo para comenzar
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {loans.map((loan) => {
        const initials = loan.client.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)

        const status = statusConfig[loan.status as keyof typeof statusConfig] || statusConfig.active
        const remaining = Number(loan.total_debt) - Number(loan.amount_paid)
        const progress = (Number(loan.amount_paid) / Number(loan.total_debt)) * 100

        return (
          <Link
            key={loan.id}
            href={`/dashboard/loans/${loan.id}`}
            className="block"
          >
            <Card className="transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={loan.client.photo_url || undefined} alt={loan.client.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{loan.client.full_name}</p>
                      <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 shrink-0", status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {formatCurrency(loan.principal_amount)}
                      </span>
                      <span>•</span>
                      <span>
                        Cuota: {formatCurrency(loan.daily_installment)}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            loan.status === "completed" ? "bg-primary" : "bg-success"
                          )}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground min-w-[32px] text-right">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(remaining)}</p>
                    <p className="text-[10px] text-muted-foreground">pendiente</p>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
