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
import { User, Phone, MapPin, CreditCard, Save } from "lucide-react"

interface ClientFormProps {
  client?: {
    id: string
    full_name: string
    id_number?: string
    phone?: string
    phone_secondary?: string
    address?: string
    notes?: string
    collector_id?: string
  }
  defaultCollectorId?: string
  collectors?: { id: string; full_name: string }[]
  isAdmin?: boolean
}

export function ClientForm({ client, defaultCollectorId, collectors = [], isAdmin }: ClientFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!client

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      full_name: formData.get("full_name") as string,
      id_number: formData.get("id_number") as string || null,
      phone: formData.get("phone") as string || null,
      phone_secondary: formData.get("phone_secondary") as string || null,
      address: formData.get("address") as string || null,
      notes: formData.get("notes") as string || null,
      collector_id: formData.get("collector_id") as string || defaultCollectorId,
    }

    try {
      if (isEditing) {
        const { error: updateError } = await supabase
          .from("clients")
          .update(data)
          .eq("id", client.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from("clients")
          .insert(data)

        if (insertError) throw insertError
      }

      router.push("/dashboard/clients")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al guardar el cliente")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre Completo *
              </FieldLabel>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Juan Pérez"
                defaultValue={client?.full_name}
                required
                autoFocus
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="id_number" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cédula / ID
              </FieldLabel>
              <Input
                id="id_number"
                name="id_number"
                placeholder="001-0000000-0"
                defaultValue={client?.id_number || ""}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono Principal
                </FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="809-000-0000"
                  defaultValue={client?.phone || ""}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="phone_secondary">
                  Teléfono Secundario
                </FieldLabel>
                <Input
                  id="phone_secondary"
                  name="phone_secondary"
                  type="tel"
                  placeholder="809-000-0000"
                  defaultValue={client?.phone_secondary || ""}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección
              </FieldLabel>
              <Textarea
                id="address"
                name="address"
                placeholder="Calle, sector, ciudad..."
                rows={2}
                defaultValue={client?.address || ""}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notas</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Información adicional del cliente..."
                rows={2}
                defaultValue={client?.notes || ""}
              />
            </Field>

            {isAdmin && collectors.length > 0 && (
              <Field>
                <FieldLabel htmlFor="collector_id">Asignar Cobrador</FieldLabel>
                <select
                  id="collector_id"
                  name="collector_id"
                  defaultValue={client?.collector_id || defaultCollectorId}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Spinner className="mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
