"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, Copy, Eye, PauseCircle, Pencil, Plus, RefreshCw, RotateCcw, XCircle } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { ActorLicenseEditor } from "@/components/dashboard/actor-license-editor"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatDisplayDate } from "@/lib/date-format"
import type { ActorLicenseView } from "@/lib/actor-licences"

type Option = { id: string; label: string }
type References = { types: Option[]; cycles: Option[]; statuses: Option[]; actors: Array<Option & { typeId: string; status: string }> }
type Mode = "create" | "renew" | "edit" | "view"
const emptyReferences: References = { types: [], cycles: [], statuses: [], actors: [] }

export default function ActorLicensesPage() {
  const { toast } = useToast()
  const [licenses, setLicenses] = useState<ActorLicenseView[]>([])
  const [references, setReferences] = useState<References>(emptyReferences)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [federal, setFederal] = useState(false)
  const [editor, setEditor] = useState<{ open: boolean; mode: Mode; item: ActorLicenseView | null }>({ open: false, mode: "create", item: null })
  const [filters, setFilters] = useState({ search: "", type: "all", status: "all", cycle: "all", due: "all" })

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/actor-licences", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || "Lecture impossible.")
      setLicenses(payload.licenses || []); setReferences(payload.references || emptyReferences)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lecture impossible.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(); void fetch("/api/auth/me").then((r) => r.json()).then((p) => setFederal(p?.user?.role === "federal")) }, [load])
  const visible = useMemo(() => licenses.filter((x) => !filters.search || `${x.id} ${x.number} ${x.actorId} ${x.actorName}`.toLocaleLowerCase("fr").includes(filters.search.toLocaleLowerCase("fr"))).filter((x) => filters.type === "all" || x.typeId === filters.type).filter((x) => filters.status === "all" || x.effectiveStatus === filters.status).filter((x) => filters.cycle === "all" || x.cycleId === filters.cycle).filter((x) => filters.due === "all" || x.remainingDays !== null && x.remainingDays >= 0 && x.remainingDays <= Number(filters.due)), [licenses, filters])
  const openEditor = (mode: Mode, item: ActorLicenseView | null = null) => setEditor({ open: true, mode, item })

  const transition = async (item: ActorLicenseView, action: "suspend" | "reactivate" | "close" | "cancel") => {
    const labels = { suspend: "suspendre", reactivate: "réactiver", close: "clôturer", cancel: "annuler" }
    if (!confirm(`Confirmer : ${labels[action]} la licence ${item.id} ?`)) return
    const observations = action === "cancel" ? prompt("Motif ou précision (facultatif)", item.observations) ?? item.observations : item.observations
    try {
      const response = await fetch(`/api/actor-licences/${encodeURIComponent(item.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, observations }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || "Action impossible.")
      toast({ title: "Statut actualisé", description: item.actorName }); await load()
    } catch (cause) { toast({ variant: "destructive", title: "Action impossible", description: cause instanceof Error ? cause.message : "Erreur inconnue." }) }
  }
  const filterSelect = (key: keyof typeof filters, label: string, options: Option[]) => <Select value={filters[key]} onValueChange={(value) => setFilters((old) => ({ ...old, [key]: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{label}</SelectItem>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select>
  const actions = (x: ActorLicenseView) => <div className="flex flex-wrap justify-center gap-1"><Button size="icon-sm" variant="ghost" title="Consulter" onClick={() => openEditor("view", x)}><Eye /></Button>{federal && x.effectiveStatus !== "ANNULEE" ? <><Button size="icon-sm" variant="ghost" title="Renouveler" onClick={() => openEditor("renew", x)}><RefreshCw /></Button><Button size="icon-sm" variant="ghost" title="Modifier" onClick={() => openEditor("edit", x)}><Pencil /></Button></> : null}{federal && ["VALIDE", "A_VENIR"].includes(x.effectiveStatus) ? <Button size="icon-sm" variant="ghost" title="Suspendre" onClick={() => void transition(x, "suspend")}><PauseCircle /></Button> : null}{federal && x.effectiveStatus === "SUSPENDUE" && (x.remainingDays ?? -1) >= 0 ? <Button size="icon-sm" variant="ghost" title="Réactiver" onClick={() => void transition(x, "reactivate")}><RotateCcw /></Button> : null}{federal && ["VALIDE", "A_VENIR", "SUSPENDUE"].includes(x.effectiveStatus) ? <Button size="icon-sm" variant="ghost" title="Clôturer" onClick={() => void transition(x, "close")}><Ban /></Button> : null}{federal && x.effectiveStatus !== "ANNULEE" ? <Button size="icon-sm" variant="ghost" title="Annuler" onClick={() => void transition(x, "cancel")}><XCircle /></Button> : null}<Button size="icon-sm" variant="ghost" title="Copier l’identifiant" onClick={() => void navigator.clipboard.writeText(x.id).then(() => toast({ title: "Identifiant copié" }))}><Copy /></Button></div>
  const columns: Column<ActorLicenseView>[] = [{ key: "number", header: "N° licence", className: "font-mono" }, { key: "actorName", header: "Acteur", render: (x) => <div><p className="font-medium">{x.actorName}</p><p className="text-xs text-muted-foreground">{x.actorId}</p></div> }, { key: "type", header: "Type" }, { key: "cycle", header: "Cycle" }, { key: "deliveryDate", header: "Délivrée le", render: (x) => formatDisplayDate(x.deliveryDate) }, { key: "validFrom", header: "Début", render: (x) => formatDisplayDate(x.validFrom) }, { key: "validUntil", header: "Expiration", render: (x) => <div>{formatDisplayDate(x.validUntil)}<p className="text-xs text-muted-foreground">{x.remainingDays === null ? "—" : x.remainingDays < 0 ? `Expirée depuis ${Math.abs(x.remainingDays)} j` : `${x.remainingDays} j restant(s)`}</p></div> }, { key: "effectiveStatus", header: "Statut", render: (x) => <StatusBadge status={x.effectiveStatus.replace("_", " ")} /> }]
  const metrics = [["Total", visible.length], ["Valides aujourd’hui", visible.filter((x) => x.effectiveStatus === "VALIDE").length], ["À venir", visible.filter((x) => x.effectiveStatus === "A_VENIR").length], ["Expirées", visible.filter((x) => x.effectiveStatus === "EXPIREE").length], ["Suspendues", visible.filter((x) => x.effectiveStatus === "SUSPENDUE").length], ["Expiration ≤ 30 j", visible.filter((x) => x.effectiveStatus === "VALIDE" && (x.remainingDays ?? 31) <= 30).length]] as const

  return <div className="flex flex-col"><Header title="Licences des acteurs" subtitle="Coachs, officiels, arbitres et médecins" /><main className="space-y-6 p-4 sm:p-6"><div className="flex justify-end gap-2">{federal ? <Button onClick={() => openEditor("create")}><Plus />Enregistrer une licence</Button> : null}<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw />Actualiser</Button></div>{error ? <Card><CardContent className="py-8 text-center text-destructive">{error}</CardContent></Card> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{metrics.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-2xl font-bold">{loading ? "…" : value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Répartition par type</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">{references.types.map((t) => <div className="rounded-lg border p-3" key={t.id}><p className="text-sm text-muted-foreground">{t.label}</p><strong className="text-xl">{visible.filter((x) => x.typeId === t.id).length}</strong></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Échéances</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-3">{[["0 à 30 jours", 0, 30], ["31 à 60 jours", 31, 60], ["61 à 90 jours", 61, 90]].map(([label, from, to]) => <div className="rounded-lg border p-3" key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><strong className="text-xl">{visible.filter((x) => x.effectiveStatus === "VALIDE" && x.remainingDays !== null && x.remainingDays >= Number(from) && x.remainingDays <= Number(to)).length}</strong></div>)}</CardContent></Card></div><Card><CardHeader><CardTitle>Licences enregistrées</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6"><Input value={filters.search} onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))} placeholder="Nom, numéro ou identifiant…" />{filterSelect("type", "Tous les types", references.types)}{filterSelect("status", "Tous les statuts", [{ id: "VALIDE", label: "Valide" }, { id: "A_VENIR", label: "À venir" }, { id: "EXPIREE", label: "Expirée" }, { id: "SUSPENDUE", label: "Suspendue" }, { id: "CLOTUREE", label: "Clôturée" }, { id: "ANNULEE", label: "Annulée" }])}{filterSelect("cycle", "Tous les cycles", references.cycles)}{filterSelect("due", "Toutes échéances", [{ id: "30", label: "Sous 30 jours" }, { id: "60", label: "Sous 60 jours" }, { id: "90", label: "Sous 90 jours" }])}<Button variant="ghost" onClick={() => setFilters({ search: "", type: "all", status: "all", cycle: "all", due: "all" })}>Réinitialiser</Button></div>{loading ? <p className="py-10 text-center text-muted-foreground">Chargement…</p> : <DataTable data={visible} columns={columns} idKey="__key" searchPlaceholder="Affiner la recherche…" renderActions={actions} renderMobileCard={(x) => <Card><CardContent className="space-y-2 p-4"><div className="flex justify-between"><strong>{x.actorName}</strong><StatusBadge status={x.effectiveStatus.replace("_", " ")} /></div><p className="text-sm">{x.number} · {x.type}</p><p className="text-xs text-muted-foreground">{formatDisplayDate(x.validFrom)} — {formatDisplayDate(x.validUntil)}</p>{actions(x)}</CardContent></Card>} />}</CardContent></Card></>}</main><ActorLicenseEditor open={editor.open} onOpenChange={(open) => setEditor((old) => ({ ...old, open }))} references={references} mode={editor.mode} license={editor.item} history={editor.item ? licenses.filter((x) => x.typeId === editor.item?.typeId && x.actorId === editor.item.actorId) : []} onSaved={() => void load()} /></div>
}
