"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { formatDisplayDate } from "@/lib/date-format"
import { searchLicenceOptions } from "@/lib/licence-options"
import type { ActorLicenseView } from "@/lib/actor-licences"

type Option = { id: string; label: string }
type ActorOption = Option & { typeId: string; status: string }
type References = { types: Option[]; cycles: Option[]; statuses: Option[]; actors: ActorOption[] }
type Mode = "create" | "renew" | "edit" | "view"
const today = () => new Date().toISOString().slice(0, 10)
const nextDay = (date: string) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10) }

function ActorPicker({ value, onChange, options, disabled }: { value: string; onChange: (value: string) => void; options: ActorOption[]; disabled?: boolean }) {
  const selected = options.find((option) => option.id === value)
  const [query, setQuery] = useState("")
  useEffect(() => setQuery(selected?.label || ""), [selected?.id, selected?.label])
  const visible = useMemo(() => searchLicenceOptions(options, query, 40), [options, query])
  return <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={query} disabled={disabled} placeholder="Nom ou identifiant de l’acteur" onChange={(event) => { setQuery(event.target.value); onChange("") }} />{!disabled && query.trim().length >= 2 && !value ? <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">{visible.length ? visible.map((option) => <button key={option.id} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => onChange(option.id)}><span className="block font-medium">{option.label}</span><span className="text-xs text-muted-foreground">{option.id}</span></button>) : <p className="p-3 text-sm text-muted-foreground">Aucun acteur trouvé.</p>}</div> : null}</div>
}

export function ActorLicenseEditor({ open, onOpenChange, references, mode, license, history = [], onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; references: References; mode: Mode; license?: ActorLicenseView | null; history?: ActorLicenseView[]; onSaved: () => void }) {
  const { toast } = useToast()
  const guard = useRef(false)
  const [form, setForm] = useState({ typeId: "", actorId: "", cycleId: "", number: "", delivery: today(), start: today(), end: "", observations: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const readOnly = mode === "view"
  const locked = mode !== "create"
  const actors = references.actors.filter((item) => item.typeId === form.typeId).sort((a, b) => Number(b.status === "ACTIF") - Number(a.status === "ACTIF") || a.label.localeCompare(b.label, "fr"))
  const actor = references.actors.find((item) => item.typeId === form.typeId && item.id === form.actorId)
  const set = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }))

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(license ? { typeId: license.typeId, actorId: license.actorId, cycleId: license.cycleId, number: license.number, delivery: mode === "renew" ? today() : license.deliveryDate, start: mode === "renew" ? nextDay(license.validUntil) : license.validFrom, end: mode === "renew" ? "" : license.validUntil, observations: mode === "renew" ? "" : license.observations } : { typeId: "", actorId: "", cycleId: "", number: "", delivery: today(), start: today(), end: "", observations: "" })
  }, [open, license, mode])

  const submit = async () => {
    if (guard.current || readOnly) return
    guard.current = true; setSaving(true); setErrors({})
    try {
      const body = { id_type_acteur: form.typeId, id_acteur: form.actorId, id_cycle_licence: form.cycleId, numero_licence: form.number, date_delivrance: form.delivery, date_debut_validite: form.start, date_fin_validite: form.end, observations: form.observations }
      const response = await fetch(mode === "edit" && license ? `/api/actor-licences/${encodeURIComponent(license.id)}` : "/api/actor-licences", { method: mode === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const payload = await response.json()
      if (!response.ok) { setErrors({ ...payload?.error?.fields, _form: payload?.error?.message || "Enregistrement impossible." }); return }
      toast({ title: mode === "renew" ? "Licence renouvelée" : mode === "edit" ? "Licence modifiée" : "Licence enregistrée", description: `${actor?.label || license?.actorName || "Acteur"} · ${form.number}` })
      onSaved(); onOpenChange(false)
    } catch { setErrors({ _form: "Service temporairement indisponible." }) }
    finally { guard.current = false; setSaving(false) }
  }
  const select = (value: string, key: keyof typeof form, options: Option[], disabled = false) => <Select value={value} onValueChange={(next) => set(key, next)} disabled={disabled || saving}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select>
  const fieldError = (key: string) => errors[key] ? <p className="text-sm text-destructive">{errors[key]}</p> : null
  const title = mode === "view" ? "Consulter la licence" : mode === "edit" ? "Modifier la licence" : mode === "renew" ? "Renouveler la licence" : "Enregistrer une licence"

  return <Sheet open={open} onOpenChange={(next) => !saving && onOpenChange(next)}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>Licence individuelle, indépendante d’une saison, d’une équipe ou d’une affiliation.</SheetDescription></SheetHeader><fieldset disabled={readOnly} className="space-y-5 px-4 pb-28">{license ? <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-4 text-sm"><div><span className="text-muted-foreground">Identifiant</span><p className="font-mono">{license.id}</p></div><div><span className="text-muted-foreground">Statut</span><p className="mt-1"><StatusBadge status={license.effectiveStatus.replace("_", " ")} /></p></div></div> : null}<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Type d’acteur *</Label>{select(form.typeId, "typeId", references.types, locked)}{fieldError("id_type_acteur")}</div><div className="space-y-2"><Label>Acteur *</Label><ActorPicker value={form.actorId} onChange={(value) => set("actorId", value)} options={actors} disabled={locked} />{fieldError("id_acteur")}</div></div>{actor || license ? <div className="rounded-xl border p-4"><p className="font-semibold">{actor?.label || license?.actorName}</p><p className="text-sm text-muted-foreground">{form.actorId} · {references.types.find((item) => item.id === form.typeId)?.label}</p></div> : null}<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Numéro officiel *</Label><Input value={form.number} onChange={(e) => set("number", e.target.value)} />{fieldError("numero_licence")}</div><div className="space-y-2"><Label>Cycle *</Label>{select(form.cycleId, "cycleId", references.cycles)}{fieldError("id_cycle_licence")}</div><div className="space-y-2"><Label>Délivrée le *</Label><Input type="date" value={form.delivery} onChange={(e) => set("delivery", e.target.value)} />{fieldError("date_delivrance")}</div><div className="space-y-2"><Label>Début de validité *</Label><Input type="date" value={form.start} onChange={(e) => set("start", e.target.value)} />{fieldError("date_debut_validite")}</div><div className="space-y-2"><Label>Expiration *</Label><Input type="date" value={form.end} onChange={(e) => set("end", e.target.value)} />{fieldError("date_fin_validite")}</div><div className="space-y-2 sm:col-span-2"><Label>Observations</Label><Textarea value={form.observations} onChange={(e) => set("observations", e.target.value)} />{fieldError("observations")}</div></div>{mode === "view" ? <section className="space-y-3"><h3 className="font-semibold">Historique de l’acteur</h3>{history.length ? [...history].sort((a, b) => b.validFrom.localeCompare(a.validFrom)).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><p className="font-medium">{item.number} · {item.cycle}</p><p className="text-muted-foreground">{formatDisplayDate(item.validFrom)} — {formatDisplayDate(item.validUntil)}</p></div><StatusBadge status={item.effectiveStatus.replace("_", " ")} /></div>) : <p className="text-sm text-muted-foreground">Aucun historique disponible.</p>}</section> : null}{errors._form ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors._form}</p> : null}</fieldset><SheetFooter className="absolute inset-x-0 bottom-0 border-t bg-background"><Button variant="outline" onClick={() => onOpenChange(false)}>{readOnly ? "Fermer" : "Annuler"}</Button>{readOnly ? null : <Button onClick={() => void submit()} disabled={saving || !form.typeId || !form.actorId || !form.cycleId || !form.number || !form.delivery || !form.start || !form.end}>{saving ? "Enregistrement…" : mode === "renew" ? "Renouveler la licence" : mode === "edit" ? "Enregistrer les modifications" : "Enregistrer la licence"}</Button>}</SheetFooter></SheetContent></Sheet>
}
