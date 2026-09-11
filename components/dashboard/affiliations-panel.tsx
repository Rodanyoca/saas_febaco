"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eye, Loader2, Pencil, Plus, RefreshCw } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { AffiliationKind } from "@/lib/affiliations"

type Item = Record<string, string>; type Option = { id: string; label: string }
type Refs = { teams: Option[]; statuses: Option[]; functions: Option[]; coachFunctions: Option[]; entityTypes: Option[]; entities: Record<string, Option[]> }
const emptyRefs: Refs = { teams: [], statuses: [], functions: [], coachFunctions: [], entityTypes: [], entities: {} }
const labels: Record<AffiliationKind, string> = { athlete: "athlète", coach: "coach", medecin: "médecin", officiel: "officiel", autre: "autre acteur" }
const blank = (kind: AffiliationKind): Item => ({ id_equipe: "", id_fonction: "", id_type_entite: kind === "officiel" ? "STR001" : "", id_entite: "", entite: "", date_debut: "", date_fin: "", id_statut_affiliation: "SAF001", observation: "" })

export function AffiliationsPanel({ kind, actorId }: { kind: AffiliationKind; actorId: string }) {
  const { toast } = useToast(), guard = useRef(false)
  const [items, setItems] = useState<Item[]>([]), [refs, setRefs] = useState<Refs>(emptyRefs), [federal, setFederal] = useState(false)
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [open, setOpen] = useState(false), [editing, setEditing] = useState<Item | null>(null), [viewing, setViewing] = useState(false)
  const [values, setValues] = useState<Item>(() => blank(kind)), [errors, setErrors] = useState<Item>({}), [saving, setSaving] = useState(false)
  const load = useCallback(async () => { setLoading(true); setLoadError(""); try { const response = await fetch(`/api/affiliations/${kind}?actorId=${encodeURIComponent(actorId)}`, { cache: "no-store" }), json = await response.json(); if (!response.ok) throw new Error(json.error?.message || json.error || "Lecture impossible."); setItems(Array.isArray(json.affiliations) ? json.affiliations : []) } catch (error) { setLoadError(error instanceof Error ? error.message : "Lecture impossible.") } finally { setLoading(false) } }, [kind, actorId])
  useEffect(() => { void load(); void Promise.all([fetch("/api/auth/me"), fetch("/api/affiliations/referentiels", { cache: "no-store" })]).then(async ([meResponse, refsResponse]) => { const [me, data] = await Promise.all([meResponse.json(), refsResponse.json()]); setFederal(me?.user?.role === "federal"); if (refsResponse.ok) setRefs(data) }) }, [load])
  useEffect(() => {
    const refresh = () => void load()
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh() }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [load])
  const start = (item?: Item, readOnly = false) => { setEditing(item ?? null); setViewing(readOnly); setValues(item ? { ...blank(kind), ...item } : blank(kind)); setErrors({}); setOpen(true) }
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value, ...(key === "id_type_entite" ? { id_entite: "" } : {}) }))
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (viewing || guard.current) return; guard.current = true; setSaving(true); setErrors({}); try { const response = await fetch(`/api/affiliations/${kind}${editing ? `/${encodeURIComponent(editing.id)}` : ""}`, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, actorId }) }), json = await response.json(); if (!response.ok) { setErrors({ ...json.error?.fields, _form: json.error?.message || json.error || "Enregistrement impossible." }); return } setItems((current) => [json.affiliation, ...current.filter((item) => item.id !== json.affiliation.id)].sort((a, b) => b.date_debut.localeCompare(a.date_debut))); setOpen(false); toast({ title: editing ? "Affiliation modifiée" : "Affiliation créée", description: "L’historique a été actualisé." }) } catch { setErrors({ _form: "Service temporairement indisponible." }) } finally { guard.current = false; setSaving(false) } }
  const field = (key: string, label: string, type = "text", options?: Option[]) => <div className="space-y-2"><Label htmlFor={`${kind}-${key}`}>{label}</Label>{options ? <Select value={values[key]} onValueChange={(value) => set(key, value)} disabled={saving || viewing}><SelectTrigger id={`${kind}-${key}`} aria-invalid={!!errors[key]}><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select> : type === "textarea" ? <Textarea id={`${kind}-${key}`} value={values[key]} onChange={(e) => set(key, e.target.value)} disabled={saving || viewing} /> : <Input id={`${kind}-${key}`} type={type} value={values[key]} onChange={(e) => set(key, e.target.value)} disabled={saving || viewing} aria-invalid={!!errors[key]} />}{errors[key] ? <p className="text-sm text-destructive">{errors[key]}</p> : null}</div>
  const headers = kind === "officiel" ? ["Entité", "Type", "Fonction", "Date de début", "Date de fin", "Statut"] : kind === "autre" ? ["Entité", "Date de début", "Date de fin", "Statut"] : kind === "coach" ? ["Équipe", "Club", "Fonction", "Date de début", "Date de fin", "Statut"] : ["Équipe", "Club", "Date de début", "Date de fin", "Statut"]
  const cells = (item: Item) => kind === "officiel" ? [item.entite || item.id_entite, refs.entityTypes.find((x) => x.id === item.id_type_entite)?.label || item.id_type_entite, item.fonction || item.id_fonction, item.date_debut, item.date_fin || "En cours", item.statut] : kind === "autre" ? [item.entite, item.date_debut, item.date_fin || "En cours", item.statut] : kind === "coach" ? [item.equipe, item.club, item.fonction || item.id_fonction, item.date_debut, item.date_fin || "En cours", item.statut] : [item.equipe, item.club, item.date_debut, item.date_fin || "En cours", item.statut]
  const actions = (item: Item) => <div className="flex justify-center gap-1"><Button variant="ghost" size="icon-sm" onClick={() => start(item, true)} aria-label="Consulter"><Eye /></Button>{federal ? <Button variant="ghost" size="icon-sm" onClick={() => start(item)} aria-label="Modifier"><Pencil /></Button> : null}</div>
  const anomalies = items.filter((item) => item.anomalie)
  return <Card><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle>Affiliations</CardTitle><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Actualiser les affiliations" title="Actualiser"><RefreshCw className={loading ? "animate-spin" : ""} /></Button>{federal ? <Button onClick={() => start()}><Plus />Ajouter une affiliation</Button> : null}</div></CardHeader><CardContent>
    {anomalies.length ? <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{anomalies.map((item) => item.anomalie).join(" · ")}</div> : null}
    {loadError ? <div role="alert" className="rounded-lg border border-destructive/30 p-4"><p>{loadError}</p><Button variant="outline" className="mt-3" onClick={() => void load()}><RefreshCw />Réessayer</Button></div> : loading ? <p className="text-muted-foreground"><Loader2 className="mr-2 inline animate-spin" />Chargement…</p> : items.length === 0 ? <p className="text-muted-foreground">Aucune affiliation enregistrée.</p> : <><div className="grid gap-3 md:hidden">{items.map((item) => <div key={item.id} className="rounded-lg border p-4">{headers.map((header, i) => <div key={header} className="grid grid-cols-2 gap-2 py-1 text-sm"><span className="text-muted-foreground">{header}</span><span>{cells(item)[i]}</span></div>)}{actions(item)}</div>)}</div><div className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${headers.length},minmax(0,1fr)) 5rem` }}><>{headers.map((header) => <div key={header} className="border-b p-3 text-sm font-medium">{header}</div>)}<div className="border-b p-3 text-center text-sm font-medium">Actions</div></>{items.map((item) => <div key={item.id} className="contents">{cells(item).map((cell, i) => <div key={i} className="min-w-0 break-words border-b p-3 text-sm">{i === cells(item).length - 1 ? <StatusBadge status={cell} /> : cell}</div>)}<div className="border-b p-2">{actions(item)}</div></div>)}</div></>}
  </CardContent><Sheet open={open} onOpenChange={setOpen}><SheetContent className="overflow-y-auto"><form onSubmit={submit} className="flex min-h-full flex-col"><SheetHeader><SheetTitle>{viewing ? "Consulter" : editing ? "Modifier" : "Ajouter"} une affiliation</SheetTitle><SheetDescription>Affiliation de {labels[kind]} — l’identifiant reste immuable.</SheetDescription></SheetHeader><div className="flex-1 space-y-4 px-4 py-2">
    {["athlete", "coach", "medecin"].includes(kind) ? field("id_equipe", "Équipe", "text", refs.teams) : null}{kind === "coach" ? field("id_fonction", "Fonction", "text", refs.coachFunctions) : null}
    {kind === "officiel" ? <>{field("id_type_entite", "Type d’entité", "text", refs.entityTypes)}{values.id_type_entite === "STR099" ? field("id_entite", "Identifiant de l’entité autre") : field("id_entite", "Entité", "text", refs.entities[values.id_type_entite] || [])}{field("id_fonction", "Fonction", "text", refs.functions)}</> : null}
    {kind === "autre" ? field("entite", "Entité") : null}{field("date_debut", "Date de début", "date")}{field("date_fin", "Date de fin (facultative)", "date")}{field("id_statut_affiliation", "Statut", "text", refs.statuses)}{field("observation", "Observation", "textarea")}{errors._form ? <p role="alert" className="text-sm text-destructive">{errors._form}</p> : null}
  </div><SheetFooter>{!viewing ? <Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null}{editing ? "Enregistrer" : "Créer"}</Button> : null}<Button type="button" variant="outline" onClick={() => setOpen(false)}>Fermer</Button></SheetFooter></form></SheetContent></Sheet></Card>
}
