"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CalendarRange, Loader2, RefreshCw } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import type { SeasonSettings } from "@/lib/current-season-domain"

export function SeasonSettingsClient() {
  const [settings, setSettings] = useState<SeasonSettings | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [error, setError] = useState(""), [success, setSuccess] = useState("")
  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/parametres", { cache: "no-store" }), body = await response.json()
      if (!response.ok) throw new Error(body.error?.message || body.error || "Lecture des paramètres impossible.")
      setSettings(body.settings); setSelectedId(body.settings.currentSeasonId)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lecture impossible."); setSettings(null) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const selected = settings?.seasons.find(season => season.id === selectedId)
  const canSave = Boolean(settings && selected && !selected.disabled && selectedId !== settings.currentSeasonId && !loading && !saving)
  const save = async () => {
    if (!canSave || !settings) return
    setSaving(true); setError(""); setSuccess("")
    try {
      const response = await fetch("/api/parametres", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId: selectedId, expectedSeasonId: settings.currentSeasonId }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message || body.error || "Enregistrement impossible.")
      setSettings(body.settings); setSelectedId(body.settings.currentSeasonId)
      setSuccess(`La saison ${body.settings.currentSeason.label} est maintenant la saison courante.`)
      window.dispatchEvent(new Event("febaco:season-changed"))
      if ("BroadcastChannel" in window) { const channel = new BroadcastChannel("febaco-season"); channel.postMessage("changed"); channel.close() }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible.") }
    finally { setSaving(false) }
  }
  return <div className="flex flex-col">
    <Header title="Paramètres" subtitle="Configuration de la saison courante FEBACO" />
    <main className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <nav aria-label="Fil d’Ariane" className="text-sm text-muted-foreground"><Link href="/dashboard" className="hover:underline">Accueil</Link><span aria-hidden="true" className="px-2">/</span><span aria-current="page" className="text-foreground">Paramètres</span></nav>
      {error ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}
      {success ? <div role="status" className="rounded-lg border border-green-600/30 bg-green-600/5 p-4 text-sm">{success}</div> : null}
      <Card className="max-w-xl border-primary/30 bg-primary/[0.04]">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarRange className="size-5 text-primary" />Saison courante</CardTitle><CardDescription>Détermine la licence affichée dans la liste des athlètes. Sa sélection ne modifie pas le statut des saisons.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          {loading ? <p role="status" className="text-sm text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />Chargement des saisons…</p> : settings ? <>
            {settings.currentSeason ? <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saison utilisée actuellement</p><p className="mt-2 text-3xl font-semibold">{settings.currentSeason.label}</p>{settings.currentSeason.status ? <Badge variant="secondary" className="mt-3">{settings.currentSeason.status}</Badge> : null}</div> : <div role="status" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">Aucune saison courante n’est définie. Un administrateur autorisé doit la sélectionner pour afficher les licences saisonnières.</div>}
            <Separator />
            <div className="space-y-2"><Label htmlFor="current-season">Définir la saison courante</Label>
              <Select value={selectedId} onValueChange={value => { setSelectedId(value); setSuccess("") }} disabled={saving || !settings.seasons.length}>
                <SelectTrigger id="current-season" className="w-full"><SelectValue placeholder="Sélectionner une saison" /></SelectTrigger>
                <SelectContent>{settings.seasons.map(season => <SelectItem key={season.id} value={season.id} disabled={season.disabled}>{season.label}{season.status ? ` — ${season.status}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <AlertDialog><AlertDialogTrigger asChild><Button className="w-full" disabled={!canSave}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Définir comme saison courante</Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Changer la saison courante ?</AlertDialogTitle><AlertDialogDescription>La saison {selected?.label} sera utilisée pour les licences affichées dans la liste des athlètes. Aucune licence ni affiliation ne sera supprimée ou déplacée.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction disabled={!canSave} onClick={() => void save()}>Confirmer le changement</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground">Modification réservée aux superadministrateurs selon les permissions FEBACO existantes.</p>
          </> : null}
          <Button variant="outline" onClick={() => void load()} disabled={loading || saving}><RefreshCw className="mr-2 size-4" />Actualiser</Button>
        </CardContent>
      </Card>
    </main>
  </div>
}
