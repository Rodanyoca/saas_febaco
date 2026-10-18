"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { formatDisplayDate } from "@/lib/date-format"
import type { ActorLicenseView, ActorLicenseType } from "@/lib/actor-licences"

export function ActorLicenseHistoryTable({ actorId, typeId }: { actorId: string; typeId: ActorLicenseType }) {
  const [items, setItems] = useState<ActorLicenseView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    const controller = new AbortController()
    let canceled = false
    setLoading(true); setItems([]); setError("")
    void (async () => {
      try {
        const query = new URLSearchParams({ type: typeId, recherche: actorId })
        const response = await fetch(`/api/actor-licences?${query}`, { cache: "no-store", signal: controller.signal })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error?.message || "Lecture des licences impossible.")
        if (!canceled) setItems((body.licenses || []).filter((item: ActorLicenseView) => item.typeId === typeId && item.actorId === actorId))
      } catch (cause) {
        if (!canceled) setError(cause instanceof Error ? cause.message : "Lecture des licences impossible.")
      } finally { if (!canceled) setLoading(false) }
    })()
    return () => { canceled = true; controller.abort() }
  }, [actorId, typeId])

  return <Card>
    <CardHeader><CardTitle>Historique des licences</CardTitle></CardHeader>
    <CardContent>
      {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader><TableRow><TableHead>Cycle</TableHead><TableHead>Numéro</TableHead><TableHead>Délivrée le</TableHead><TableHead>Validité</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Chargement des licences…</TableCell></TableRow>
              : error ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Historique indisponible.</TableCell></TableRow>
              : items.length ? items.map(item => <TableRow key={item.id}>
                <TableCell>{item.cycle || "—"}</TableCell>
                <TableCell className="font-mono font-medium">{item.number || "—"}</TableCell>
                <TableCell>{formatDisplayDate(item.deliveryDate)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDisplayDate(item.validFrom)} — {formatDisplayDate(item.validUntil)}</TableCell>
                <TableCell><StatusBadge status={item.effectiveStatus.replace(/_/g, " ")} /></TableCell>
              </TableRow>)
              : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucune licence enregistrée.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
}
