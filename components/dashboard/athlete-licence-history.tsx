"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { AthleteLicence } from "@/lib/models"

const display = (value: unknown) => String(value ?? "").trim() || "-"

// Mounted by TabsContent only while Licence is selected. No retained client cache.
export function AthleteLicenceHistory({ athleteId }: { athleteId: string }) {
  const [history, setHistory] = useState({ athleteId, licences: [] as AthleteLicence[], loading: true, error: "" })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let canceled = false
    setHistory({ athleteId, licences: [], loading: true, error: "" })
    void (async () => {
      try {
        const query = new URLSearchParams({ athleteId })
        const response = await fetch(`/api/athlete-licences?${query}`, { cache: "no-store", signal: controller.signal })
        const payload = await response.json()
        if (!response.ok || !Array.isArray(payload?.licences)) throw new Error("Impossible de charger les licences. Réessayez.")
        if (!canceled) setHistory({ athleteId, licences: payload.licences, loading: false, error: "" })
      } catch {
        if (!canceled) setHistory({ athleteId, licences: [], loading: false, error: "Impossible de charger les licences. Réessayez." })
      }
    })()
    return () => { canceled = true; controller.abort() }
  }, [athleteId, retry])

  const current = history.athleteId === athleteId ? history : { licences: [], loading: true, error: "" }
  return <Card>
    <CardHeader><CardTitle>Historique des licences</CardTitle></CardHeader>
    <CardContent>
      {current.error ? <div role="alert" className="space-y-3 text-sm text-destructive"><p>{current.error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Réessayer</Button></div> :
        <div className="rounded-lg border border-border"><Table>
          <TableHeader><TableRow><TableHead>Saison</TableHead><TableHead>Numéro</TableHead><TableHead>Structure</TableHead><TableHead>Délivrée le</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>{current.loading ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Chargement des licences...</TableCell></TableRow> : current.licences.length ? current.licences.map(licence =>
            <TableRow key={licence.__key ?? licence.id}><TableCell>{display(licence.saison)}</TableCell><TableCell className="font-mono font-medium">{display(licence.numero)}</TableCell><TableCell>{display(licence.structure)}</TableCell><TableCell>{display(licence.dateDelivrance)}</TableCell><TableCell><StatusBadge status={licence.statut} /></TableCell></TableRow>
          ) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucune licence enregistrée.</TableCell></TableRow>}</TableBody>
        </Table></div>}
    </CardContent>
  </Card>
}
