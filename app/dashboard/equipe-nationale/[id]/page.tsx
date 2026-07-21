"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, Medal, Trophy, UserCheck, Users } from "lucide-react"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { PersonCell } from "@/components/dashboard/person-cell"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  displaySync,
  nationalScoreLabel,
  nationalScoreTotal,
  resolveResultatCompetition,
  resolveSelectionParticipant,
} from "@/lib/equipe-nationale-utils"
import type {
  EquipeNationale,
  EquipeNationaleCompetition,
  EquipeNationaleParticipant,
  EquipeNationaleResultat,
  EquipeNationaleSelection,
} from "@/lib/models"

async function loadList<T>(url: string, key: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    const json = await res.json()
    return Array.isArray(json?.[key]) ? json[key] : []
  } catch {
    return []
  }
}

const selectionColumns: Column<EquipeNationaleSelection>[] = [
  { key: "athleteNom", header: "Athlète", render: (item) => <PersonCell name={displaySync(item.athleteNom)} avatarUrl={item.avatarUrl} subtitle={item.athleteId} /> },
  { key: "equipeNom", header: "Équipe" },
  { key: "clubNom", header: "Club" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "saison", header: "Saison" },
  { key: "dateDebutSelection", header: "Début" },
  { key: "dateFinSelection", header: "Fin" },
  { key: "statutSelection", header: "Statut", render: (item) => <StatusBadge status={item.statutSelection} /> },
]

const competitionColumns: Column<EquipeNationaleCompetition>[] = [
  { key: "id", header: "ID participation", className: "font-mono text-sm" },
  { key: "competitionNom", header: "Compétition", className: "font-medium", render: (item) => displaySync(item.competitionNom) },
  { key: "niveauCompetition", header: "Niveau" },
  { key: "dateDebut", header: "Début" },
  { key: "dateFin", header: "Fin" },
  { key: "lieu", header: "Lieu" },
  { key: "statutParticipation", header: "Statut", render: (item) => <StatusBadge status={item.statutParticipation} /> },
]

const participantColumns: Column<EquipeNationaleParticipant>[] = [
  { key: "athleteNom", header: "Athlète", render: (item) => <PersonCell name={displaySync(item.athleteNom)} avatarUrl={item.avatarUrl} subtitle={item.athleteId} /> },
  { key: "competitionNom", header: "ID participation", render: (item) => item.participationId },
  { key: "equipeNom", header: "Équipe" },
  { key: "clubNom", header: "Club" },
  { key: "poste", header: "Poste" },
  { key: "statutParticipant", header: "Statut", render: (item) => <StatusBadge status={item.statutParticipant} /> },
]

const resultatColumns: Column<EquipeNationaleResultat>[] = [
  { key: "dateMatch", header: "Date" },
  { key: "competitionNom", header: "Compétition", render: (item) => displaySync(item.competitionNom) },
  { key: "phase", header: "Phase" },
  { key: "adversaire", header: "Adversaire", className: "font-medium" },
  { key: "scoreTotalRdc", header: "Score", render: (item) => <span className="font-semibold">{nationalScoreLabel(item)}</span> },
  { key: "resultatMatch", header: "Résultat" },
  { key: "statutMatch", header: "Statut", render: (item) => <StatusBadge status={item.statutMatch} /> },
]

function isWin(resultat: EquipeNationaleResultat): boolean {
  const label = String(resultat.resultatMatch ?? "").toLowerCase()
  if (label.includes("victoire") || label === "v" || label === "win") return true
  return nationalScoreTotal(resultat, "rdc") > nationalScoreTotal(resultat, "adversaire")
}

function isLoss(resultat: EquipeNationaleResultat): boolean {
  const label = String(resultat.resultatMatch ?? "").toLowerCase()
  if (label.includes("défaite") || label.includes("defaite") || label === "d" || label === "loss") return true
  return nationalScoreTotal(resultat, "rdc") < nationalScoreTotal(resultat, "adversaire")
}

export default function EquipeNationaleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [equipesNationales, setEquipesNationales] = useState<EquipeNationale[]>([])
  const [selections, setSelections] = useState<EquipeNationaleSelection[]>([])
  const [competitions, setCompetitions] = useState<EquipeNationaleCompetition[]>([])
  const [participants, setParticipants] = useState<EquipeNationaleParticipant[]>([])
  const [resultats, setResultats] = useState<EquipeNationaleResultat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      const [equipesData, selectionsData, competitionsData, participantsData, resultatsData] =
        await Promise.all([
          loadList<EquipeNationale>("/api/equipe-nationale", "equipesNationales"),
          loadList<EquipeNationaleSelection>("/api/equipe-nationale-selections", "selections"),
          loadList<EquipeNationaleCompetition>("/api/equipe-nationale-competitions", "competitions"),
          loadList<EquipeNationaleParticipant>("/api/equipe-nationale-participants", "participants"),
          loadList<EquipeNationaleResultat>("/api/equipe-nationale-resultats", "resultats"),
        ])
      if (!canceled) {
        setEquipesNationales(equipesData)
        setSelections(selectionsData)
        setCompetitions(competitionsData)
        setParticipants(participantsData)
        setResultats(resultatsData)
        setLoading(false)
      }
    })()
    return () => { canceled = true }
  }, [])

  const equipeNationale = useMemo(
    () => equipesNationales.find((item) => item.id === idParam),
    [equipesNationales, idParam]
  )

  const relatedSelections = useMemo(
    () => selections.filter((item) => item.equipeNationaleId === idParam),
    [selections, idParam]
  )

  const relatedCompetitions = useMemo(
    () => competitions.filter((item) => item.equipeNationaleId === idParam),
    [competitions, idParam]
  )

  const participationIds = useMemo(
    () => new Set(relatedCompetitions.map((item) => item.id).filter(Boolean)),
    [relatedCompetitions]
  )

  const relatedParticipants = useMemo(
    () => participants
      .filter((item) => item.equipeNationaleId === idParam || participationIds.has(item.participationId))
      .map((item) => resolveSelectionParticipant(item, relatedSelections)),
    [participants, idParam, participationIds, relatedSelections]
  )

  const relatedResultats = useMemo(
    () => resultats
      .map((item) => resolveResultatCompetition(item, competitions))
      .filter((item) => item.equipeNationaleId === idParam || participationIds.has(item.participationId)),
    [resultats, competitions, idParam, participationIds]
  )

  const dernierResultat = useMemo(() => {
    const dated = [...relatedResultats].filter((item) => item.dateMatch && item.dateMatch !== "-")
    dated.sort((a, b) => String(b.dateMatch).localeCompare(String(a.dateMatch)))
    const last = dated[0] ?? relatedResultats[relatedResultats.length - 1]
    return last ? `${last.adversaire || "Adversaire"} · ${nationalScoreLabel(last)}` : "-"
  }, [relatedResultats])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6 text-muted-foreground">Chargement de l'équipe nationale...</div>
      </div>
    )
  }

  if (!equipeNationale) {
    return (
      <div className="flex flex-col">
        <Header title="Équipe nationale non trouvée" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">L'équipe nationale demandée n'existe pas.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title={`Équipe nationale: ${equipeNationale.nom}`} subtitle={equipeNationale.saison} />
      <div className="flex-1 space-y-6 p-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <DetailCard
          title="Informations générales"
          icon={Trophy}
          fields={[
            { label: "ID", value: equipeNationale.id },
            { label: "Nom", value: equipeNationale.nom },
            { label: "Catégorie", value: equipeNationale.categorie },
            { label: "Genre", value: equipeNationale.genre },
            { label: "Saison", value: equipeNationale.saison },
            { label: "Statut", value: equipeNationale.statut },
            { label: "Observation", value: equipeNationale.observation },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Sélectionnés" value={relatedSelections.length} icon={Users} />
          <StatCard title="Compétitions" value={relatedCompetitions.length} icon={Trophy} />
          <StatCard title="Participants" value={relatedParticipants.length} icon={UserCheck} />
          <StatCard title="Matchs" value={relatedResultats.length} icon={CalendarDays} />
          <StatCard title="Victoires" value={relatedResultats.filter(isWin).length} icon={Medal} />
          <StatCard title="Défaites" value={relatedResultats.filter(isLoss).length} icon={Medal} />
        </div>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Dernier résultat enregistré</p>
            <p className="mt-1 text-lg font-semibold">{dernierResultat}</p>
          </CardContent>
        </Card>

        <Section title="Athlètes sélectionnés">
          <DataTable data={relatedSelections} columns={selectionColumns} searchPlaceholder="Rechercher un athlète..." idKey="__key" />
        </Section>
        <Section title="Compétitions suivies">
          <DataTable data={relatedCompetitions} columns={competitionColumns} searchPlaceholder="Rechercher une compétition..." idKey="__key" />
        </Section>
        <Section title="Participants par compétition">
          <DataTable data={relatedParticipants} columns={participantColumns} searchPlaceholder="Rechercher un participant..." idKey="__key" />
        </Section>
        <Section title="Résultats">
          <DataTable data={relatedResultats} columns={resultatColumns} searchPlaceholder="Rechercher un match..." idKey="__key" />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-6 w-6 text-primary" />
      </CardContent>
    </Card>
  )
}
