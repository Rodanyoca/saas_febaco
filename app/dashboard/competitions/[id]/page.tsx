"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Trophy } from "lucide-react"

import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { scoreLabel } from "@/lib/competition-utils"
import { classementDifference } from "@/lib/competition-utils"
import type {
  Competition,
  CompetitionClassement,
  CompetitionParticipant,
  CompetitionResultat,
  CompetitionUnite,
} from "@/lib/models"

function normalizeId(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
}

function decodeCompetitionRouteId(value: string): string {
  try {
    return decodeURIComponent(value.replace(/~/g, "%"))
  } catch {
    return value
  }
}

async function loadCompetition(id: string): Promise<Competition | undefined> {
  try {
    const query = new URLSearchParams({ competitionId: id })
    const res = await fetch(`/api/competitions?${query.toString()}`, { cache: "no-store" })
    const json = await res.json()
    const filtered = Array.isArray(json?.competitions) ? json.competitions : []
    return filtered.find((item: Competition) => normalizeId(item.id) === normalizeId(id))
  } catch {
    return undefined
  }
}

async function loadParticipants(competitionId: string): Promise<CompetitionParticipant[]> {
  try {
    const query = new URLSearchParams({ competitionId })
    const res = await fetch(`/api/competitions-participants?${query.toString()}`, { cache: "no-store" })
    const json = await res.json()
    const filtered = Array.isArray(json?.participants) ? json.participants : []
    return filtered.filter(
      (item: CompetitionParticipant) => normalizeId(item.competitionId) === normalizeId(competitionId)
    )
  } catch {
    return []
  }
}

async function loadUnites(competitionId: string): Promise<CompetitionUnite[]> {
  try {
    const query = new URLSearchParams({ competitionId })
    const res = await fetch(`/api/competitions-unites?${query.toString()}`, { cache: "no-store" })
    const json = await res.json()
    const filtered = Array.isArray(json?.unites) ? json.unites : []
    return filtered.filter(
      (item: CompetitionUnite) => normalizeId(item.competitionId) === normalizeId(competitionId)
    )
  } catch {
    return []
  }
}

async function loadResultats(competitionId: string): Promise<CompetitionResultat[]> {
  try {
    const query = new URLSearchParams({ competitionId })
    const res = await fetch(`/api/competitions-resultats?${query.toString()}`, { cache: "no-store" })
    const json = await res.json()
    const filtered = Array.isArray(json?.resultats) ? json.resultats : []
    return filtered.filter(
      (item: CompetitionResultat) => normalizeId(item.competitionId) === normalizeId(competitionId)
    )
  } catch {
    return []
  }
}

async function loadClassements(competitionId: string): Promise<CompetitionClassement[]> {
  try {
    const query = new URLSearchParams({ competitionId })
    const res = await fetch(`/api/competitions-classement?${query.toString()}`, { cache: "no-store" })
    const json = await res.json()
    const filtered = Array.isArray(json?.classements) ? json.classements : []
    return filtered.filter(
      (item: CompetitionClassement) => normalizeId(item.competitionId) === normalizeId(competitionId)
    )
  } catch {
    return []
  }
}

const participantColumns: Column<CompetitionParticipant>[] = [
  { key: "athleteNom", header: "Nom de l’athlète", className: "font-medium" },
  { key: "sexe", header: "Sexe" },
  { key: "posteNom", header: "Poste" },
  { key: "equipeNom", header: "Équipe" },
  { key: "clubNom", header: "Club" },
  {
    key: "statut",
    header: "Statut de participation",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

const uniteColumns: Column<CompetitionUnite>[] = [
  { key: "clubNom", header: "Nom", className: "font-medium" },
  { key: "poule", header: "Poule" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

const resultatColumns: Column<CompetitionResultat>[] = [
  { key: "dateMatch", header: "Date du match" },
  { key: "heureMatch", header: "Heure" },
  {
    key: "uniteANom",
    header: "Rencontre",
    className: "font-medium",
    render: (item) => `${item.uniteANom} vs ${item.uniteBNom}`,
  },
  {
    key: "scoreTotalA",
    header: "Score",
    className: "font-semibold",
    render: (item) => scoreLabel(item),
  },
  { key: "phase", header: "Phase" },
]

const classementColumns: Column<CompetitionClassement>[] = [
  { key: "rang", header: "Rang", className: "font-semibold" },
  { key: "uniteNom", header: "Équipe", className: "font-medium" },
  { key: "matchJoue", header: "MJ" },
  { key: "victoire", header: "MG" },
  { key: "defaite", header: "MP" },
  { key: "points", header: "Pts", className: "font-semibold" },
  { key: "scorePour", header: "Pour" },
  { key: "scoreContre", header: "Contre" },
  { key: "difference", header: "Diff.", render: (item) => classementDifference(item) },
]

function ComingSoon({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        L’onglet {label} sera bientôt disponible.
      </CardContent>
    </Card>
  )
}

export default function CompetitionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    const value = Array.isArray(raw) ? raw[0] : raw
    return value ? decodeCompetitionRouteId(value) : undefined
  }, [params])

  const [competition, setCompetition] = useState<Competition>()
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([])
  const [unites, setUnites] = useState<CompetitionUnite[]>([])
  const [resultats, setResultats] = useState<CompetitionResultat[]>([])
  const [classements, setClassements] = useState<CompetitionClassement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      if (!idParam) {
        if (!canceled) setLoading(false)
        return
      }

      const [data, participantData, uniteData, resultatData, classementData] = await Promise.all([
        loadCompetition(idParam),
        loadParticipants(idParam),
        loadUnites(idParam),
        loadResultats(idParam),
        loadClassements(idParam),
      ])
      if (!canceled) {
        setCompetition(data)
        setParticipants(participantData)
        setUnites(uniteData)
        setResultats(resultatData)
        const sortedClassements = [...classementData]
          .sort((a, b) => {
            const points = Number(b.points || 0) - Number(a.points || 0)
            if (points !== 0) return points
            const differenceA = Number(classementDifference(a) || 0)
            const differenceB = Number(classementDifference(b) || 0)
            if (differenceB !== differenceA) return differenceB - differenceA
            return Number(b.scorePour || 0) - Number(a.scorePour || 0)
          })
          .map((item, index) => ({ ...item, rang: String(index + 1) }))
        setClassements(sortedClassements)
        setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [idParam])

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
          <p className="text-muted-foreground">La compétition demandée n’existe pas.</p>
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
      <Header title={`Compétition : ${competition.nom}`} subtitle={competition.saison} />

      <div className="flex-1 space-y-6 p-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="equipes">Équipes</TabsTrigger>
            <TabsTrigger value="resultats">Résultats</TabsTrigger>
            <TabsTrigger value="classement">Classement</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6 lg:grid-cols-2">
              <DetailCard
                title="Informations générales"
                icon={Trophy}
                fields={[
                  { label: "ID", value: competition.id },
                  { label: "Nom", value: competition.nom },
                  { label: "Type", value: competition.typeCompetition },
                  { label: "ID discipline", value: competition.disciplineId },
                  { label: "Discipline", value: competition.discipline },
                  { label: "Saison", value: competition.saison },
                  { label: "Niveau", value: competition.niveau },
                  { label: "Statut", value: competition.statut },
                ]}
              />
              <DetailCard
                title="Calendrier / lieu"
                icon={MapPin}
                fields={[
                  { label: "Date de début", value: competition.dateDebut },
                  { label: "Date de fin", value: competition.dateFin },
                  { label: "Lieu", value: competition.lieu },
                  { label: "ID structure organisatrice", value: competition.structureOrganisatriceId },
                  { label: "Structure organisatrice", value: competition.structureOrganisatriceNom },
                  { label: "Observation", value: competition.observation },
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardContent className="p-6">
                <DataTable
                  data={participants}
                  columns={participantColumns}
                  searchPlaceholder="Rechercher un participant..."
                  idKey="__key"
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="equipes">
            <Card>
              <CardContent className="p-6">
                <DataTable
                  data={unites}
                  columns={uniteColumns}
                  searchPlaceholder="Rechercher une équipe..."
                  idKey="__key"
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="resultats">
            <Card>
              <CardContent className="p-6">
                <DataTable
                  data={resultats}
                  columns={resultatColumns}
                  searchPlaceholder="Rechercher un match..."
                  idKey="__key"
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="classement">
            <Card>
              <CardContent className="p-6">
                <DataTable
                  data={classements}
                  columns={classementColumns}
                  searchPlaceholder="Rechercher une équipe..."
                  idKey="__key"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
