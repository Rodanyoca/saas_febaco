"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ComponentType } from "react"
import {
  Check,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  Trophy,
  Upload,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ExportActionId, ImportExportMode } from "@/lib/import-export/template-types"
import { cn } from "@/lib/utils"
import { formatDisplayDate } from "@/lib/date-format"

type LigueOption = { id: string; nom: string }
type EntenteOption = { id: string; nom: string; ligueId: string }
type TeamOption = {
  id: string
  nom: string
  clubId: string
  club: string
  ententeId: string
  entente: string
  ligueId: string
  ligue: string
  statut: string
}
type CompetitionOption = {
  id: string
  nom: string
  saison: string
  typeCompetition: string
  niveau: string
  lieu: string
  dateDebut: string
  dateFin: string
  statut: string
}
type ExportActionConfig = {
  id: ExportActionId
  label: string
  description: string
  detail: string
  icon: ComponentType<{ className?: string }>
}

const exportActions: ExportActionConfig[] = [
  {
    id: "ADD_NEW_ATHLETES",
    label: "Ajouter de nouveaux athlètes",
    description: "Générer une fiche permettant d’enregistrer de nouveaux athlètes ainsi que leur première affiliation.",
    detail: "Le gabarit sera limité à une saison, une ligue et une entente.",
    icon: UserPlus,
  },
  {
    id: "PREPARE_COMPETITION",
    label: "Préparer une compétition",
    description: "Rechercher une compétition existante, sélectionner les structures concernées et préparer son gabarit.",
    detail: "La compétition doit déjà exister dans le système.",
    icon: Trophy,
  },
]

const seasons = Array.from({ length: 10 }, (_, index) => String(2021 + index))

const clean = (value: unknown) => String(value ?? "").trim()
const visible = (value: unknown) => {
  const text = clean(value)
  return text && text !== "-" ? text : ""
}

function SelectionCard({
  title,
  description,
  icon: Icon,
  selected,
  disabled,
  badge,
  onClick,
}: {
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  selected?: boolean
  disabled?: boolean
  badge: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-xl border bg-card p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary bg-primary/5",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("rounded-lg bg-muted p-2", selected && "bg-primary/10 text-primary")}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-semibold">{title}</span>
        </div>
        <Badge variant={disabled ? "secondary" : "outline"}>{badge}</Badge>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{description}</p>
    </button>
  )
}

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>
}

export default function ImportExportPage() {
  const [selectedMode, setSelectedMode] = useState<ImportExportMode | null>(null)
  const [selectedAction, setSelectedAction] = useState<ExportActionId | null>(null)
  const [ligues, setLigues] = useState<LigueOption[]>([])
  const [ententes, setEntentes] = useState<EntenteOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [canGenerate, setCanGenerate] = useState(false)
  const [season, setSeason] = useState("")
  const [leagueId, setLeagueId] = useState("")
  const [ententeId, setEntenteId] = useState("")
  const [competitionSearch, setCompetitionSearch] = useState("")
  const [competitionSeason, setCompetitionSeason] = useState("")
  const [competitionId, setCompetitionId] = useState("")
  const [structureSearch, setStructureSearch] = useState("")
  const [structureLeague, setStructureLeague] = useState("all")
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [simulating, setSimulating] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    Promise.all([
      fetch("/api/ligues", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/ententes", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/equipes", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/competitions", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([leagueData, ententeData, teamData, competitionData, sessionData]) => {
      if (cancelled) return
      setLigues(Array.isArray(leagueData?.ligues) ? leagueData.ligues : [])
      setEntentes(Array.isArray(ententeData?.ententes) ? ententeData.ententes : [])
      setTeams(Array.isArray(teamData?.equipes) ? teamData.equipes : [])
      setCompetitions(Array.isArray(competitionData?.competitions) ? competitionData.competitions.map((item: CompetitionOption) => ({ ...item, dateDebut: formatDisplayDate(item.dateDebut), dateFin: formatDisplayDate(item.dateFin) })) : [])
      setCanGenerate(sessionData?.user?.role === "federal")
    }).catch(() => {
      if (!cancelled) setLoadError(true)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const availableEntentes = useMemo(() => ententes.filter((item) => clean(item.ligueId) === leagueId), [ententes, leagueId])
  const selectedLeague = ligues.find((item) => clean(item.id) === leagueId)
  const selectedEntente = ententes.find((item) => clean(item.id) === ententeId)
  const selectedCompetition = competitions.find((item) => clean(item.id) === competitionId)
  const competitionResults = useMemo(() => {
    const query = competitionSearch.toLowerCase().trim()
    const seasonCompetitions = competitions.filter((item) => clean(item.saison) === competitionSeason)
    if (!query) return seasonCompetitions.slice(0, 8)
    return seasonCompetitions.filter((item) => `${item.id} ${item.nom}`.toLowerCase().includes(query)).slice(0, 12)
  }, [competitions, competitionSearch, competitionSeason])
  const filteredTeams = useMemo(() => {
    const query = structureSearch.toLowerCase().trim()
    return teams.filter((team) => {
      if (structureLeague !== "all" && clean(team.ligueId) !== structureLeague) return false
      return !query || [team.id, team.nom, team.ligue, team.entente, team.club, team.statut].join(" ").toLowerCase().includes(query)
    })
  }, [teams, structureLeague, structureSearch])
  const selectedTeams = teams.filter((team) => selectedTeamIds.has(clean(team.id)))
  const selectedClubCount = new Set(selectedTeams.map((team) => clean(team.clubId)).filter(Boolean)).size
  const selectedEntenteCount = new Set(selectedTeams.map((team) => clean(team.ententeId)).filter(Boolean)).size

  function chooseAction(action: ExportActionId) {
    setSelectedAction(action)
    setShowErrors(false)
    setSeason("")
    setLeagueId("")
    setEntenteId("")
    setCompetitionSearch("")
    setCompetitionSeason("")
    setCompetitionId("")
    setStructureSearch("")
    setStructureLeague("all")
    setSelectedTeamIds(new Set())
  }

  function toggleTeam(id: string) {
    setSelectedTeamIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function generateAthletesTemplate() {
    setShowErrors(true)
    if (!athleteValid) return
    setSimulating(true)
    try {
      const response = await fetch("/api/import-export/export/new-athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, leagueId, ententeId }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "La génération du gabarit a échoué.")
      }

      const blob = await response.blob()
      const disposition = response.headers.get("Content-Disposition")
      const fileName = disposition?.match(/filename="?([^";]+)"?/i)?.[1] || `NOUVEAUX_ATHLETES_${season}_${ententeId}.xlsx`
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000)

      const teamsCount = response.headers.get("X-Teams-Count")
      toast.success("Gabarit généré avec succès.", {
        description: teamsCount
          ? `${teamsCount} équipe${teamsCount === "1" ? "" : "s"} de l’entente ont été injectées dans le fichier.`
          : "Le fichier contextualisé a été téléchargé.",
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La génération du gabarit a échoué.")
    } finally {
      setSimulating(false)
    }
  }

  async function generateCompetitionWorkbook() {
    setShowErrors(true)
    if (!competitionValid) return
    setSimulating(true)
    try {
      const response = await fetch("/api/import-export/export/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: competitionSeason,
          competitionId,
          teamIds: [...selectedTeamIds],
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || payload?.error || "La génération du gabarit a échoué.")
      }
      const blob = await response.blob()
      const disposition = response.headers.get("Content-Disposition")
      const fileName = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ||
        `COMPETITION_${competitionSeason}_${competitionId}.xlsx`
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000)
      const teamsCount = response.headers.get("X-Teams-Count") || String(selectedTeamIds.size)
      const athletesCount = response.headers.get("X-Athletes-Count") || "0"
      toast.success("Gabarit de compétition généré avec succès.", {
        description: `${teamsCount} équipe${teamsCount === "1" ? "" : "s"} et ${athletesCount} athlète${athletesCount === "1" ? "" : "s"} actif${athletesCount === "1" ? "" : "s"} injectés.`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La génération du gabarit a échoué.")
    } finally {
      setSimulating(false)
    }
  }

  const athleteValid = Boolean(season && leagueId && ententeId)
  const competitionValid = Boolean(competitionSeason && competitionId && selectedTeamIds.size)
  const currentStep = !selectedMode ? 1 : !selectedAction ? 2 : selectedAction === "ADD_NEW_ATHLETES"
    ? athleteValid ? 4 : 3
    : competitionValid ? 4 : 3

  return (
    <div className="flex flex-col">
      <Header title="Import / Export" subtitle="Générez des gabarits adaptés aux opérations de collecte et importez ensuite les fichiers complétés." />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Les opérations rares et les corrections individuelles restent gérées directement par l’administrateur.</p>
        {!loading && !canGenerate ? <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">La génération des gabarits est réservée à l’administration fédérale.</p> : null}

        <ol className="grid grid-cols-4 gap-2" aria-label="Progression">
          {["Mode", "Action", "Configuration", "Génération"].map((label, index) => {
            const step = index + 1
            return <li key={label} className={cn("border-t-2 pt-2 text-xs sm:text-sm", step <= currentStep ? "border-primary text-foreground" : "border-muted text-muted-foreground")}><span className="font-semibold">{step}.</span> {label}</li>
          })}
        </ol>

        <section aria-labelledby="mode-title">
          <h2 id="mode-title" className="mb-3 text-lg font-semibold">1. Choisir le mode</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectionCard title="Export" description="Générer un gabarit contextualisé à compléter hors ligne." icon={Download} badge="Disponible" selected={selectedMode === "EXPORT"} onClick={() => setSelectedMode("EXPORT")} />
            <SelectionCard title="Import" description="Importer un gabarit complété et contrôler les données avant enregistrement." icon={Upload} badge="Bientôt disponible" disabled />
          </div>
        </section>

        {selectedMode === "EXPORT" ? (
          <section aria-labelledby="action-title">
            <h2 id="action-title" className="mb-3 text-lg font-semibold">2. Choisir l’action</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {exportActions.map((action) => {
                const Icon = action.icon
                const selected = selectedAction === action.id
                return (
                  <button key={action.id} type="button" aria-pressed={selected} onClick={() => chooseAction(action.id)} className={cn("rounded-xl border bg-card p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "border-primary bg-primary/5" : "hover:border-primary/60")}>
                    <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-3 font-semibold"><Icon className="h-5 w-5 text-primary" aria-hidden="true" />{action.label}</span>{selected ? <Check className="h-5 w-5 text-primary" aria-label="Sélectionnée" /> : null}</div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{action.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{action.detail}</p>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {selectedMode === "EXPORT" && !selectedAction ? (
          <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><FileSpreadsheet className="h-5 w-5" />Sélectionnez une action pour afficher son formulaire de configuration.</CardContent></Card>
        ) : null}

        {selectedAction === "ADD_NEW_ATHLETES" ? (
          <section aria-labelledby="athlete-config-title">
            <h2 id="athlete-config-title" className="mb-3 text-lg font-semibold">3. Configurer l’ajout d’athlètes</h2>
            <Card><CardHeader><CardTitle>Contexte d’enregistrement</CardTitle><CardDescription>Les champs marqués d’un astérisque sont obligatoires.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="min-w-0 space-y-2"><Label>Saison *</Label><Select value={season} onValueChange={setSeason} disabled={loading}><SelectTrigger className="w-full min-w-0 [&>span]:truncate" aria-invalid={showErrors && !season}><SelectValue placeholder="Sélectionner une saison" /></SelectTrigger><SelectContent>{seasons.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><FieldHelp>Sélectionnez la saison pour laquelle les athlètes seront enregistrés.</FieldHelp>{showErrors && !season ? <p className="text-xs text-destructive">La saison est obligatoire.</p> : null}</div>
                  <div className="min-w-0 space-y-2"><Label>Ligue *</Label><Select value={leagueId} onValueChange={(value) => { setLeagueId(value); setEntenteId("") }} disabled={loading}><SelectTrigger className="w-full min-w-0 [&>span]:truncate" aria-invalid={showErrors && !leagueId}><SelectValue placeholder={loading ? "Chargement des ligues..." : "Rechercher ou sélectionner une ligue"} /></SelectTrigger><SelectContent>{ligues.map((item) => <SelectItem key={item.id} value={clean(item.id)}>{item.nom}</SelectItem>)}</SelectContent></Select><FieldHelp>Sélectionnez la ligue responsable du périmètre d’enregistrement.</FieldHelp>{showErrors && !leagueId ? <p className="text-xs text-destructive">Sélectionnez une ligue.</p> : null}</div>
                  <div className="min-w-0 space-y-2"><Label>Entente *</Label><Select value={ententeId} onValueChange={setEntenteId} disabled={!leagueId || loading}><SelectTrigger className="w-full min-w-0 [&>span]:block [&>span]:truncate" aria-invalid={showErrors && !ententeId} title={selectedEntente?.nom}><SelectValue placeholder={!leagueId ? "Sélectionnez d’abord une ligue" : loading ? "Chargement des ententes..." : "Rechercher ou sélectionner une entente"} /></SelectTrigger><SelectContent className="max-w-[calc(100vw-2rem)]">{availableEntentes.map((item) => <SelectItem key={item.id} value={clean(item.id)} className="max-w-xl whitespace-normal">{item.nom}</SelectItem>)}</SelectContent></Select><FieldHelp>Sélectionnez une entente appartenant à la ligue choisie.</FieldHelp>{leagueId && !loading && availableEntentes.length === 0 ? <p className="text-xs text-muted-foreground">Aucune entente n’est disponible pour cette ligue.</p> : null}{showErrors && !ententeId ? <p className="text-xs text-destructive">Sélectionnez une entente.</p> : null}</div>
                </div>
                {athleteValid ? <div className="rounded-lg border bg-muted/30 p-4"><h3 className="font-semibold">Récapitulatif</h3><div className="mt-2 text-sm"><SummaryRow label="Action" value="Ajouter de nouveaux athlètes" /><SummaryRow label="Saison" value={season} /><SummaryRow label="Ligue" value={selectedLeague?.nom || leagueId} /><SummaryRow label="Entente" value={selectedEntente?.nom || ententeId} /></div><p className="mt-3 text-sm text-muted-foreground">Le gabarit contiendra uniquement les références correspondant à cette entente.</p></div> : null}
                <Button className="w-full sm:w-auto" disabled={!athleteValid || simulating || !canGenerate} onClick={generateAthletesTemplate}>{simulating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{simulating ? "Génération du fichier..." : "Générer le gabarit"}</Button>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {selectedAction === "PREPARE_COMPETITION" ? (
          <section aria-labelledby="competition-config-title" className="space-y-4">
            <h2 id="competition-config-title" className="text-lg font-semibold">3. Configurer la compétition</h2>
            <Card><CardHeader><CardTitle>Rechercher la compétition</CardTitle><CardDescription>Sélectionnez d’abord la saison, puis recherchez une compétition existante.</CardDescription></CardHeader><CardContent className="space-y-4">
              <div className="max-w-sm space-y-2"><Label>Saison *</Label><Select value={competitionSeason} onValueChange={(value) => { setCompetitionSeason(value); setCompetitionId(""); setCompetitionSearch(""); setSelectedTeamIds(new Set()) }}><SelectTrigger aria-invalid={showErrors && !competitionSeason}><SelectValue placeholder="Sélectionner une saison" /></SelectTrigger><SelectContent>{seasons.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>{showErrors && !competitionSeason ? <p className="text-xs text-destructive">La saison est obligatoire.</p> : null}</div>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={competitionSearch} onChange={(event) => setCompetitionSearch(event.target.value)} placeholder={competitionSeason ? "Rechercher par ID ou par nom" : "Sélectionnez d’abord une saison"} aria-label="Rechercher une compétition" disabled={!competitionSeason} /></div>
              {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Chargement des compétitions...</p> : loadError ? <p className="text-sm text-destructive">Erreur de chargement des compétitions.</p> : competitions.length === 0 ? <p className="text-sm text-muted-foreground">Aucune compétition disponible. Créez d’abord la compétition depuis la page Compétitions.</p> : competitionSeason && competitionResults.length === 0 ? <p className="text-sm text-muted-foreground">Aucune compétition ne correspond à cette saison et à votre recherche.</p> : competitionSeason ? <div className="max-h-64 space-y-2 overflow-y-auto">{competitionResults.map((item) => <button key={item.id} type="button" onClick={() => { setCompetitionId(clean(item.id)); setCompetitionSearch(`${item.id} — ${item.nom}`); setSelectedTeamIds(new Set()); setShowErrors(false) }} className={cn("w-full rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", competitionId === clean(item.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50")}><p className="font-mono text-xs text-muted-foreground">{item.id}</p><p className="font-medium">{item.nom}</p><p className="mt-1 text-xs text-muted-foreground">Saison {visible(item.saison) || "non précisée"}{visible(item.dateDebut) ? ` · ${item.dateDebut}${visible(item.dateFin) ? ` au ${item.dateFin}` : ""}` : ""} · {visible(item.statut) || "Statut non précisé"}</p></button>)}</div> : null}
              {showErrors && !competitionId ? <p className="text-xs text-destructive">Sélectionnez une compétition.</p> : null}
            </CardContent></Card>

            {selectedCompetition ? <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{selectedCompetition.nom}</CardTitle><CardDescription>{selectedCompetition.id}</CardDescription></div><Button asChild variant="outline" size="sm"><Link href={`/dashboard/competitions/${encodeURIComponent(selectedCompetition.id)}`}>Voir la fiche</Link></Button></div></CardHeader><CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">{[
              ["Saison", selectedCompetition.saison], ["Type", selectedCompetition.typeCompetition], ["Niveau", selectedCompetition.niveau], ["Lieu", selectedCompetition.lieu], ["Date de début", selectedCompetition.dateDebut], ["Date de fin", selectedCompetition.dateFin], ["Statut", selectedCompetition.statut],
            ].filter(([, value]) => visible(value)).map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>)}</CardContent></Card> : null}

            {selectedCompetition ? <Card><CardHeader><CardTitle>Structures concernées</CardTitle><CardDescription>Sélectionnez les équipes qui devront apparaître dans le futur gabarit de la compétition.</CardDescription></CardHeader><CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_220px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={structureSearch} onChange={(event) => setStructureSearch(event.target.value)} placeholder="Rechercher une structure" aria-label="Rechercher une structure" /></div><Select value={structureLeague} onValueChange={setStructureLeague}><SelectTrigger><SelectValue placeholder="Toutes les ligues" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les ligues</SelectItem>{ligues.map((item) => <SelectItem key={item.id} value={clean(item.id)}>{item.nom}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">{selectedTeamIds.size} équipe{selectedTeamIds.size > 1 ? "s" : ""} sélectionnée{selectedTeamIds.size > 1 ? "s" : ""}</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setSelectedTeamIds(new Set(filteredTeams.map((team) => clean(team.id))))}>Tout sélectionner</Button><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTeamIds(new Set())}>Tout désélectionner</Button></div></div>
              {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Chargement des structures...</p> : filteredTeams.length === 0 ? <p className="rounded-lg border p-5 text-sm text-muted-foreground">Aucune structure compatible n’a été trouvée pour cette compétition.</p> : <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border p-2">{filteredTeams.map((team) => { const id = clean(team.id); return <label key={id} className="flex cursor-pointer items-start gap-3 rounded-md p-3 hover:bg-muted/50"><Checkbox checked={selectedTeamIds.has(id)} onCheckedChange={() => toggleTeam(id)} aria-label={`Sélectionner ${team.nom}`} /><span className="min-w-0"><span className="block font-medium">{team.nom} <span className="font-mono text-xs text-muted-foreground">{team.id}</span></span><span className="block truncate text-xs text-muted-foreground">{[team.ligue, team.entente, team.club, team.statut].filter(visible).join(" · ")}</span></span></label> })}</div>}
              {showErrors && selectedTeamIds.size === 0 ? <p className="text-xs text-destructive">Sélectionnez au moins une structure.</p> : null}
            </CardContent></Card> : null}

            {competitionValid && selectedCompetition ? <Card><CardHeader><CardTitle>Récapitulatif</CardTitle></CardHeader><CardContent><div className="text-sm"><SummaryRow label="Action" value="Préparer une compétition" /><SummaryRow label="Compétition" value={selectedCompetition.nom} /><SummaryRow label="ID" value={selectedCompetition.id} /><SummaryRow label="Saison" value={visible(selectedCompetition.saison) || "-"} /><SummaryRow label="Structures sélectionnées" value={`${selectedTeamIds.size} équipes`} /><SummaryRow label="Clubs concernés" value={selectedClubCount} /><SummaryRow label="Ententes concernées" value={selectedEntenteCount} /></div><p className="mt-4 text-sm text-muted-foreground">Le gabarit sera généré à partir des référentiels de la compétition et des structures sélectionnées.</p></CardContent></Card> : null}
            <Button className="w-full sm:w-auto" disabled={!competitionValid || simulating || !canGenerate} onClick={generateCompetitionWorkbook}>{simulating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}{simulating ? "Génération du fichier..." : "Générer le gabarit de la compétition"}</Button>
          </section>
        ) : null}
      </main>
    </div>
  )
}
