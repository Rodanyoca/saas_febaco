"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { AnalyticsTable, DashboardSection, EmptyAnalyticsState, StatGrid, StatValue } from "@/components/dashboard/analytics"
import { DataQualitySection } from "@/components/dashboard/data-quality-section"
import { Button } from "@/components/ui/button"
import { actorCompletionSummary, clean, countActors, groupCount, groupStatuses, percent, sexSummary, statusSummary, type DataRow } from "@/lib/dashboard/calculations"
import type { DashboardAffiliationSummary, DashboardLicenceSummary } from "@/lib/dashboard/affiliation-summary"

type DatasetKey = "ligues" | "ententes" | "clubs" | "equipes" | "athletes" | "coachs" | "arbitres" | "officiels" | "medecins" | "autres" | "affiliations" | "competitions" | "participants" | "competitionResults" | "nationalTeams" | "selections" | "nationalCompetitions" | "nationalResults"
type Datasets = Record<DatasetKey, DataRow[]>
const emptyDatasets = (): Datasets => ({ ligues: [], ententes: [], clubs: [], equipes: [], athletes: [], coachs: [], arbitres: [], officiels: [], medecins: [], autres: [], affiliations: [], competitions: [], participants: [], competitionResults: [], nationalTeams: [], selections: [], nationalCompetitions: [], nationalResults: [] })
const emptyAffiliationSummary: DashboardAffiliationSummary = { total: 0, active: 0, inactive: 0, unknown: 0, statuses: [] }
const emptyLicenceSummary: DashboardLicenceSummary = { total: 0, active: 0, expired: 0, families: [] }
export default function DashboardPage() {
  const [data, setData] = useState<Datasets>(emptyDatasets)
  const [affiliationSummary, setAffiliationSummary] = useState<DashboardAffiliationSummary>(emptyAffiliationSummary)
  const [licenceSummary, setLicenceSummary] = useState<DashboardLicenceSummary>(emptyLicenceSummary)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [qualityRefreshKey, setQualityRefreshKey] = useState(0)

  const load = useCallback(async (refreshQuality = false) => {
    setLoading(true)
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" }), payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Lecture impossible")
      setData(Object.fromEntries(Object.keys(emptyDatasets()).map((key) => [key, Array.isArray(payload?.[key]) ? payload[key] : []])) as Datasets)
      setAffiliationSummary(payload.affiliationSummary ?? emptyAffiliationSummary)
      setLicenceSummary(payload.licenceSummary ?? emptyLicenceSummary)
      setErrors(Array.isArray(payload.errors) ? payload.errors : [])
      setUpdatedAt(new Date())
      if (refreshQuality) setQualityRefreshKey((value) => value + 1)
    } catch (error) { setErrors([error instanceof Error ? error.message : "Lecture impossible"]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const actorBlocks = useMemo(() => [data.athletes, data.coachs, data.arbitres, data.officiels, data.medecins, data.autres], [data])
  const totalActors = countActors(actorBlocks)
  const totalStructures = data.ligues.length + data.ententes.length + data.clubs.length + data.equipes.length

  const territorialRows = useMemo(() => ([
    ["Ligues", data.ligues], ["Ententes", data.ententes], ["Clubs", data.clubs], ["Équipes", data.equipes],
  ] as [string, DataRow[]][]).map(([label, rows]) => { const stats = statusSummary(rows); return { label, total: stats.total, active: stats.active, inactive: stats.inactive, unknown: stats.unknown, share: `${percent(stats.total, totalStructures)} %` } }), [data, totalStructures])

  const actorRows = useMemo(() => ([
    ["Athlètes", data.athletes], ["Entraîneurs", data.coachs], ["Arbitres", data.arbitres], ["Officiels", data.officiels], ["Médecins", data.medecins], ["Autres acteurs", data.autres],
  ] as [string, DataRow[]][]).map(([label, rows]) => { const sex = sexSummary(rows); const status = statusSummary(rows); const completion = actorCompletionSummary(rows); return { label, total: rows.length, men: sex.men, women: sex.women, active: status.active, inactive: status.inactive, complete: completion.complete, rate: `${completion.rate} %` } }), [data])

  const completionRows = useMemo(() => actorRows.map((row) => ({ label: row.label, total: row.total, complete: row.complete, incomplete: row.total - row.complete, rate: row.rate })), [actorRows])
  const globalComplete = completionRows.reduce((sum, row) => sum + row.complete, 0)
  const globalRate = percent(globalComplete, totalActors)
  const competitionStatuses = useMemo(() => groupStatuses(data.competitions, "statut").map((row) => ({ ...row, rateLabel: `${row.rate} %` })), [data.competitions])

  const nationalRows = useMemo(() => data.nationalTeams.map((team) => { const id = clean(team.id); return { id, name: clean(team.nom) || "Non renseigné", discipline: clean(team.discipline) || "Non renseigné", categorie: clean(team.categorie) || "Non renseigné", sexe: clean(team.sexe) || "Non renseigné", saison: clean(team.saison) || "Non renseigné", members: data.selections.filter((row) => clean(row.equipeNationaleId) === id).length, competitions: data.nationalCompetitions.filter((row) => clean(row.equipeNationaleId) === id).length, results: data.nationalResults.filter((row) => clean(row.equipeNationaleId) === id).length, statut: clean(team.statut) || "Non renseigné" } }).sort((a, b) => b.members - a.members), [data])


  return <div className="flex flex-col"><Header title="Tableau de bord" subtitle="Référentiel fédéral, structures, acteurs, compétitions et équipes nationales" />
    <main className="flex-1 space-y-8 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><p className="text-sm text-muted-foreground">{updatedAt ? `Dernière actualisation : ${updatedAt.toLocaleString("fr-FR")}` : "Actualisation en cours"}</p><Button variant="outline" onClick={() => void load(true)} disabled={loading}>{loading ? "Actualisation..." : "Actualiser"}</Button></div>
      {errors.length ? <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Données partielles</p><p className="mt-1">{errors.length} source{errors.length > 1 ? "s" : ""} indisponible{errors.length > 1 ? "s" : ""}. Les autres données restent affichées.</p></div> : null}
      {loading && !updatedAt ? <EmptyAnalyticsState>Chargement des indicateurs du tableau de bord...</EmptyAnalyticsState> : <>
        <DashboardSection title="Synthèse générale"><StatGrid><StatValue label="Structures territoriales" value={totalStructures.toLocaleString("fr-FR")} detail="Ligues, ententes, clubs et équipes"/><StatValue label="Acteurs enregistrés" value={totalActors.toLocaleString("fr-FR")} detail="Toutes les familles d’acteurs"/><StatValue label="Compétitions" value={data.competitions.length.toLocaleString("fr-FR")} detail={`${data.participants.length} participations enregistrées`}/><StatValue label="Complétude des acteurs" value={`${globalRate} %`} detail={`${globalComplete} fiches complètes sur ${totalActors}`}/><StatValue label="Affiliations" value={affiliationSummary.total.toLocaleString("fr-FR")} detail={`${affiliationSummary.active} actives · ${affiliationSummary.inactive} inactives`}/><StatValue label="Résultats de compétitions" value={data.competitionResults.length.toLocaleString("fr-FR")}/><StatValue label="Équipes nationales" value={data.nationalTeams.length.toLocaleString("fr-FR")} detail={`${data.selections.length} membres sélectionnés`}/><StatValue label="Résultats nationaux" value={data.nationalResults.length.toLocaleString("fr-FR")}/></StatGrid></DashboardSection>
        <DashboardSection title="Référentiel territorial" description="État des structures enregistrées."><AnalyticsTable rows={territorialRows} columns={[{key:"label",label:"Niveau territorial"},{key:"total",label:"Total",align:"right"},{key:"active",label:"Actif",align:"right"},{key:"inactive",label:"Inactif",align:"right"},{key:"unknown",label:"Statut non renseigné",align:"right"},{key:"share",label:"Part du total",align:"right"}]}/></DashboardSection>
        <DashboardSection title="Référentiel des acteurs"><AnalyticsTable rows={actorRows} columns={[{key:"label",label:"Type d’acteur"},{key:"total",label:"Total",align:"right"},{key:"men",label:"Hommes",align:"right"},{key:"women",label:"Femmes",align:"right"},{key:"active",label:"Actifs",align:"right"},{key:"inactive",label:"Inactifs",align:"right"},{key:"complete",label:"Fiches complètes",align:"right"},{key:"rate",label:"Complétude",align:"right"}]}/></DashboardSection>
        <DashboardSection title="Affiliations et licences" description="Répartition des licences par famille d’acteurs."><StatGrid><StatValue label="Affiliations" value={affiliationSummary.total}/><StatValue label="Licences" value={licenceSummary.total}/><StatValue label="Licences actives" value={licenceSummary.active}/><StatValue label="Licences expirées" value={licenceSummary.expired}/></StatGrid><AnalyticsTable rows={licenceSummary.families} columns={[{key:"label",label:"Famille"},{key:"total",label:"Licences",align:"right"},{key:"active",label:"Actives",align:"right"},{key:"expired",label:"Expirées",align:"right"}]}/></DashboardSection>
        <DashboardSection title="Compétitions et participations"><StatGrid><StatValue label="Compétitions" value={data.competitions.length}/><StatValue label="Participants" value={data.participants.length}/><StatValue label="Résultats enregistrés" value={data.competitionResults.length}/><StatValue label="Statuts distincts" value={competitionStatuses.length}/></StatGrid><AnalyticsTable rows={competitionStatuses} columns={[{key:"label",label:"Statut des compétitions"},{key:"count",label:"Nombre",align:"right"},{key:"rateLabel",label:"Pourcentage",align:"right"}]}/></DashboardSection>
        <DashboardSection title="Équipes nationales"><div className="grid gap-4 lg:grid-cols-3"><AnalyticsTable rows={groupCount(data.nationalTeams,"discipline")} columns={[{key:"label",label:"Discipline"},{key:"count",label:"Équipes",align:"right"}]}/><AnalyticsTable rows={groupCount(data.nationalTeams,"categorie")} columns={[{key:"label",label:"Catégorie"},{key:"count",label:"Équipes",align:"right"}]}/><AnalyticsTable rows={groupCount(data.nationalTeams,"sexe")} columns={[{key:"label",label:"Sexe"},{key:"count",label:"Équipes",align:"right"}]}/></div><AnalyticsTable rows={nationalRows} columns={[{key:"name",label:"Équipe nationale"},{key:"discipline",label:"Discipline"},{key:"categorie",label:"Catégorie"},{key:"sexe",label:"Sexe"},{key:"saison",label:"Saison"},{key:"members",label:"Membres",align:"right"},{key:"competitions",label:"Compétitions",align:"right"},{key:"results",label:"Résultats",align:"right"},{key:"statut",label:"Statut"}]}/></DashboardSection>
        <DataQualitySection refreshKey={qualityRefreshKey} />
      </>}
    </main>
  </div>
}
