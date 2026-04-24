"use client"

import Link from "next/link"
import { UserPlus, HandCoins, Receipt, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const actions = [
  {
    href: "/dashboard/clients/new",
    label: "Nuevo Cliente",
    icon: UserPlus,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    href: "/dashboard/loans/new",
    label: "Nuevo Préstamo",
    icon: HandCoins,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    href: "/dashboard/payments/quick",
    label: "Cobrar Cuota",
    icon: Receipt,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    href: "/dashboard/reports/daily",
    label: "Reporte Diario",
    icon: FileText,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:bg-accent transition-colors touch-manipulation"
        >
          <div className={cn("p-2.5 rounded-xl", action.color)}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium text-center leading-tight text-muted-foreground">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
