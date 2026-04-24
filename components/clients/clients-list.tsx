"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPhoneNumber } from "@/lib/format"
import type { Client } from "@/lib/types/database"

interface ClientWithStats extends Client {
  active_loans: number
  collector_name?: string
}

interface ClientsListProps {
  clients: ClientWithStats[]
}

const statusConfig = {
  active: {
    label: "Activo",
    className: "bg-success/10 text-success border-success/20",
  },
  in_arrears: {
    label: "En mora",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  paid: {
    label: "Al día",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  inactive: {
    label: "Inactivo",
    className: "bg-muted text-muted-foreground border-muted",
  },
}

export function ClientsList({ clients }: ClientsListProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <span className="text-2xl">👤</span>
          </div>
          <p className="text-sm font-medium">No hay clientes</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agrega tu primer cliente para comenzar
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {clients.map((client) => {
        const initials = client.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)

        const status = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.active

        return (
          <Link
            key={client.id}
            href={`/dashboard/clients/${client.id}`}
            className="block"
          >
            <Card className="transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={client.photo_url || undefined} alt={client.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{client.full_name}</p>
                      <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 shrink-0", status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhoneNumber(client.phone)}
                        </span>
                      )}
                      {client.active_loans > 0 && (
                        <span className="text-primary font-medium">
                          {client.active_loans} préstamo{client.active_loans !== 1 ? "s" : ""} activo{client.active_loans !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    
                    {client.address && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {client.address}
                      </p>
                    )}
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
