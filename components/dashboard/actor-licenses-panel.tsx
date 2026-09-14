"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDisplayDate } from "@/lib/date-format"
import type { ActorLicenseView } from "@/lib/actor-licences"

export function ActorLicensesPanel({ actorId, typeId }: { actorId: string; typeId: "TAC002" | "TAC003" | "TAC004" | "TAC005" }) {
  const [items, setItems] = useState<ActorLicenseView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const query = new URLSearchParams({ type: typeId, recherche: actorId })
      const response = await fetch(`/api/actor-licences?${query}`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || "Lecture impossible.")
      setItems((payload.licenses || []).filter((item: ActorLicenseView) => item.typeId === typeId && item.actorId === actorId))
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lecture impossible.") }
    finally { setLoading(false) }
  }, [actorId, typeId])
  useEffect(() => { void load() }, [load])

  return <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Historique des licences</CardTitle><Button size="icon" variant="outline" onClick={() => void load()} disabled={loading} aria-label="Actualiser les licences"><RefreshCw className={loading ? "animate-spin" : ""} /></Button></CardHeader><CardContent>{error ? <p className="text-sm text-destructive">{error}</p> : loading ? <p className="text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />Chargement…</p> : items.length === 0 ? <p className="text-muted-foreground">Aucune licence enregistrée.</p> : <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-left"><th className="p-3">N° licence</th><th className="p-3">Cycle</th><th className="p-3">Délivrée le</th><th className="p-3">Validité</th><th className="p-3">Statut</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-mono">{item.number}</td><td className="p-3">{item.cycle}</td><td className="p-3">{formatDisplayDate(item.deliveryDate)}</td><td className="p-3">{formatDisplayDate(item.validFrom)} — {formatDisplayDate(item.validUntil)}</td><td className="p-3"><StatusBadge status={item.effectiveStatus.replace("_", " ")} /></td></tr>)}</tbody></table></div>}</CardContent></Card>
}
