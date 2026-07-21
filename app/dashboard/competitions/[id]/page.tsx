"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, ListOrdered, MapPin, Trophy, Users } from "lucide-react"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { PersonCell } from "@/components/dashboard/person-cell"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { classementDifference, resolveUniteName, scoreLabel } from "@/lib/competition-utils"
import type {
  Competition,
  CompetitionClassement,
  CompetitionParticipant,
  CompetitionResultat,
  CompetitionUnite,
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

const participantColumns: Column<CompetitionParticipant>[] = [
  { key: "athleteNom", header: "Athlète", render: (item) => <PersonCell name={item.athleteNom} avatarUrl={item.avatarUrl} subtitle={item.athleteId} /> },
  { key: "equipeNom", header: "Équipe" },
  { key: "clubNom", header: "Club" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

const uniteColumns: Column<CompetitionUnite>[] = [
  { key: "id", header: "ID unité", className: "font-mono text-sm" },
  { key: "equipeNom", header: "Équipe", className: "font-medium" },
  { key: "clubNom", header: "Club" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "poule", header: "Poule" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

function resultColumns(unites: CompetitionUnite[]): Column<CompetitionResultat>[] {
  return [
    { key: "dateMatch", header: "Date" },
    { key: "phase", header: "Phase" },
    { key: "poule", header: "Poule" },
    { key: "uniteANom", header: "Unité A", render: (item) => resolveUniteName(item.uniteAId, item.uniteANom, unites) },
    { key: "scoreTotalA", header: "Score", render: (item) => <span className="font-semibold">{scoreLabel(item)}</span> },
    { key: "uniteBNom", header: "Unité B", render: (item) => resolveUniteName(item.uniteBId, item.uniteBNom, unites) },
    { key: "vainqueur", header: "Vainqueur" },
    { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
  ]
}

function classementColumns(unites: CompetitionUnite[]): Column<CompetitionClassement>[] {
  return [
    { key: "rang", header: "Rang", className: "font-mono text-sm" },
    { key: "uniteNom", header: "Unité", render: (item) => resolveUniteName(item.uniteId, item.uniteNom, unites) },
    { key: "phase", header: "Phase" },
    { key: "poule", header: "Poule" },
    { key: "matchJoue", header: "MJ" },
    { key: "victoire", header: "V" },
    { key: "defaite", header: "D" },
    { key: "points", header: "Pts", className: "font-semibold" },
    { key: "difference", header: "Diff.", render: (item) => classementDifference(item) },
  ]
}

export default function CompetitionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([])
  const [unites, setUnites] = useState<CompetitionUnite[]>([])
  const [resultats, setResultats] = useState<CompetitionResultat[]>([])
  const [classements, setClassements] = useState<CompetitionClassement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      const [competitionsData, participantsData, unitesData, resultatsData, classementsData] =
        await Promise.all([
          loadList<Competition>("/api/competitions", "competitions"),
          loadList<CompetitionParticipant>("/api/competitions-participants", "participants"),
          loadList<CompetitionUnite>("/api/competitions-unites", "unites"),
          loadList<CompetitionResultat>("/api/competitions-resultats", "resultats"),
          loadList<CompetitionClassement>("/api/competitions-classement", "classements"),
        ])
      if (!canceled) {
        setCompetitions(competitionsData)
        setParticipants(participantsData)
        setUnites(unitesData)
        setResultats(resultatsData)
        setClassements(classementsData)
        setLoading(false)
      }
    })()
    return () => { canceled = true }
  }, [])

  const competition = useMemo(() => competitions.find((item) => item.id === idParam), [competitions, idParam])
  const relatedParticipants = useMemo(() => participants.filter((item) => item.competitionId === idParam), [participants, idParam])
  const relatedUnites = useMemo(() => unites.filter((item) => item.competitionId === idParam), [unites, idParam])
  const relatedResultats = useMemo(() => resultats.filter((item) => item.competitionId === idParam), [resultats, idParam])
  const relatedClassements = useMemo(() => {
    return classements
      .filter((item) => item.competitionId === idParam)
      .sort((a, b) => Number(a.rang || 9999) - Number(b.rang || 9999))
  }, [classements, idParam])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6 text-muted-foreground">Chargement de la compétition...</div>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="flex flex-col">
        <Header title="Compétition non trouvée" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">La compétition demandée n'existe pas.</p>
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
      <Header title={`Compétition: ${competition.nom}`} subtitle={competition.saison} />
      <div className="flex-1 space-y-6 p-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard
            title="Informations générales"
            icon={Trophy}
            fields={[
              { label: "ID", value: competition.id },
              { label: "Nom", value: competition.nom },
              { label: "Saison", value: competition.saison },
              { label: "Catégorie", value: competition.categorie },
              { label: "Genre", value: competition.genre },
              { label: "Niveau", value: competition.niveau },
              { label: "Statut", value: competition.statut },
            ]}
          />
          <DetailCard
            title="Calendrier / lieu"
            icon={MapPin}
            fields={[
              { label: "Date début", value: competition.dateDebut },
              { label: "Date fin", value: competition.dateFin },
              { label: "Lieu", value: competition.lieu },
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Équipes" value={relatedUnites.length} icon={Users} />
          <StatCard title="Participants" value={relatedParticipants.length} icon={Users} />
          <StatCard title="Résultats" value={relatedResultats.length} icon={CalendarDays} />
          <StatCard title="Classement" value={relatedClassements.length} icon={ListOrdered} />
        </div>

        <Section title="Équipes engagées">
          <DataTable data={relatedUnites} columns={uniteColumns} searchPlaceholder="Rechercher une équipe..." idKey="__key" />
        </Section>
        <Section title="Participants">
          <DataTable data={relatedParticipants} columns={participantColumns} searchPlaceholder="Rechercher un athlète..." idKey="__key" />
        </Section>
        <Section title="Résultats">
          <DataTable data={relatedResultats} columns={resultColumns(relatedUnites)} searchPlaceholder="Rechercher un match..." idKey="__key" />
        </Section>
        <Section title="Classement">
          <DataTable data={relatedClassements} columns={classementColumns(relatedUnites)} searchPlaceholder="Rechercher une équipe..." idKey="__key" />
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
