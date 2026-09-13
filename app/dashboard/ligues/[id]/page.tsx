"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Layers, MapPin, Shield, Users } from "lucide-react"

import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { FederalEditLink } from "@/components/dashboard/federal-edit-link"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Athlete, Club, Entente, Equipe, Ligue } from "@/lib/models"

type AthletePagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function isUseful(value: unknown): boolean {
  const normalized = normalize(value)
  return Boolean(normalized && normalized !== "-")
}

function sameId(a: unknown, b: unknown): boolean {
  return isUseful(a) && isUseful(b) && normalize(a) === normalize(b)
}

function sameName(value: unknown, candidates: unknown[]): boolean {
  const normalized = normalize(value)
  if (!normalized || normalized === "-") return false
  return candidates.some((candidate) => normalize(candidate) === normalized)
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || String(value).trim() === "") continue
    query.set(key, String(value))
  }
  return query.toString()
}

const ententeColumns: Column<Entente>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "nom", header: "Nom", className: "font-medium" },
  { key: "pseudo", header: "Pseudo" },
  { key: "ville", header: "Ville" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

const clubColumns: Column<Club>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "nom", header: "Nom", className: "font-medium" },
  { key: "entente", header: "Entente" },
  { key: "ville", header: "Ville" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

const equipeColumns: Column<Equipe>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "nom", header: "Nom", className: "font-medium" },
  { key: "club", header: "Club" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

export default function LigueDetailPage() {
  const router = useRouter()
  const params = useParams()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [ligues, setLigues] = useState<Ligue[]>([])
  const [ententes, setEntentes] = useState<Entente[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [athletePagination, setAthletePagination] = useState<AthletePagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [athletesLoading, setAthletesLoading] = useState(false)
  const [athleteSearch, setAthleteSearch] = useState("")
  const [athleteStatus, setAthleteStatus] = useState("all")
  const [athleteSexe, setAthleteSexe] = useState("all")
  const [athletePage, setAthletePage] = useState(1)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const [liguesRes, ententesRes, clubsRes, equipesRes] = await Promise.all([
          fetch("/api/ligues", { cache: "no-store" }),
          fetch("/api/ententes", { cache: "no-store" }),
          fetch("/api/clubs", { cache: "no-store" }),
          fetch("/api/equipes", { cache: "no-store" }),
        ])

        const [liguesJson, ententesJson, clubsJson, equipesJson] = await Promise.all([
          liguesRes.json(),
          ententesRes.json(),
          clubsRes.json(),
          equipesRes.json(),
        ])

        if (!canceled) {
          setLigues(Array.isArray(liguesJson?.ligues) ? liguesJson.ligues : [])
          setEntentes(Array.isArray(ententesJson?.ententes) ? ententesJson.ententes : [])
          setClubs(Array.isArray(clubsJson?.clubs) ? clubsJson.clubs : [])
          setEquipes(Array.isArray(equipesJson?.equipes) ? equipesJson.equipes : [])
        }
      } catch {
        if (!canceled) {
          setLigues([])
          setEntentes([])
          setClubs([])
          setEquipes([])
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const ligue = useMemo(() => {
    if (!idParam) return undefined
    return ligues.find((item) => sameId(item.id, idParam))
  }, [idParam, ligues])

  const ligueNameCandidates = useMemo(() => [ligue?.nom, ligue?.pseudo], [ligue])

  const relatedEntentes = useMemo(() => {
    if (!ligue) return []
    return ententes.filter((item) => {
      if (sameId(item.ligueId, ligue.id)) return true
      return sameName(item.ligue, ligueNameCandidates)
    })
  }, [ententes, ligue, ligueNameCandidates])

  const relatedCities = useMemo(() => {
    const cities = relatedEntentes
      .map((item) => String(item.ville ?? "").trim())
      .filter((value) => value && value !== "-")

    return [...new Set(cities)].join(", ") || "-"
  }, [relatedEntentes])

  const relatedClubs = useMemo(() => {
    if (!ligue) return []
    const ententeIds = new Set(relatedEntentes.map((item) => normalize(item.id)).filter(Boolean))
    return clubs.filter((item) => {
      if (sameId(item.ligueId, ligue.id)) return true
      if (isUseful(item.ententeId) && ententeIds.has(normalize(item.ententeId))) return true
      return sameName(item.ligue, ligueNameCandidates)
    })
  }, [clubs, ligue, ligueNameCandidates, relatedEntentes])

  const relatedEquipes = useMemo(() => {
    if (!ligue) return []
    const clubIds = new Set(relatedClubs.map((item) => normalize(item.id)).filter(Boolean))
    const ententeIds = new Set(relatedEntentes.map((item) => normalize(item.id)).filter(Boolean))
    return equipes.filter((item) => {
      if (sameId(item.ligueId, ligue.id)) return true
      if (isUseful(item.clubId) && clubIds.has(normalize(item.clubId))) return true
      if (isUseful(item.ententeId) && ententeIds.has(normalize(item.ententeId))) return true
      return sameName(item.ligue, ligueNameCandidates)
    })
  }, [equipes, ligue, ligueNameCandidates, relatedClubs, relatedEntentes])

  const equipeIdsKey = useMemo(() => {
    return relatedEquipes
      .map((item) => String(item.id ?? "").trim())
      .filter((id) => id && id !== "-")
      .join(",")
  }, [relatedEquipes])

  useEffect(() => {
    setAthletePage(1)
  }, [athleteSearch, athleteStatus, athleteSexe, equipeIdsKey])

  useEffect(() => {
    if (!ligue || !equipeIdsKey) {
      setAthletes([])
      setAthletePagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }))
      return
    }

    let canceled = false
    ;(async () => {
      setAthletesLoading(true)
      try {
        const query = buildQuery({
          ligueId: ligue.id,
          equipeIds: equipeIdsKey,
          search: athleteSearch,
          statut: athleteStatus === "all" ? undefined : athleteStatus,
          sexe: athleteSexe === "all" ? undefined : athleteSexe,
          page: athletePage,
          pageSize: 25,
        })
        const res = await fetch(`/api/athlete-affiliations?${query}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setAthletes(Array.isArray(json?.athletes) ? json.athletes : [])
          setAthletePagination(
            json?.pagination ?? { page: athletePage, pageSize: 25, total: 0, totalPages: 1 }
          )
        }
      } catch {
        if (!canceled) {
          setAthletes([])
          setAthletePagination({ page: athletePage, pageSize: 25, total: 0, totalPages: 1 })
        }
      } finally {
        if (!canceled) setAthletesLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [athletePage, athleteSearch, athleteSexe, athleteStatus, equipeIdsKey, ligue])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6 text-muted-foreground">Chargement de la ligue...</div>
      </div>
    )
  }

  if (!ligue) {
    return (
      <div className="flex flex-col">
        <Header title="Ligue non trouvée" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">La ligue demandée n'existe pas.</p>
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
      <Header title={`Fiche Ligue: ${ligue.nom}`} subtitle={relatedCities !== "-" ? relatedCities : "FEBACO"} />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-3"><Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour à la liste
        </Button><FederalEditLink href={`/dashboard/ligues?edit=${encodeURIComponent(ligue.id)}`} /></div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard
            title="Informations générales"
            icon={MapPin}
            fields={[
              { label: "ID Ligue", value: ligue.id },
              { label: "Nom", value: ligue.nom },
              { label: "Pseudo", value: ligue.pseudo },
              { label: "Ville", value: relatedCities },
              { label: "Email", value: ligue.email },
              { label: "Statut", value: ligue.statut },
            ]}
          />

          <DetailCard
            title="Responsables"
            icon={Shield}
            fields={[
              { label: "Président", value: ligue.presidentNom },
              { label: "Téléphone président", value: ligue.presidentTelephone },
              { label: "Email président", value: ligue.presidentEmail },
              { label: "Secrétaire", value: ligue.secretaireNom },
              { label: "Téléphone secrétaire", value: ligue.secretaireTelephone },
              { label: "Email secrétaire", value: ligue.secretaireEmail },
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Ententes liées" value={relatedEntentes.length} icon={Layers} />
          <StatCard title="Clubs liés" value={relatedClubs.length} icon={Building2} />
          <StatCard title="Équipes liées" value={relatedEquipes.length} icon={Shield} />
          <StatCard title="Athlètes liés" value={athletePagination.total} icon={Users} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ententes liées</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={relatedEntentes}
              columns={ententeColumns}
              searchPlaceholder="Rechercher une entente..."
              idKey="__key"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clubs liés</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={relatedClubs}
              columns={clubColumns}
              searchPlaceholder="Rechercher un club..."
              idKey="__key"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Équipes liées</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={relatedEquipes}
              columns={equipeColumns}
              searchPlaceholder="Rechercher une équipe..."
              idKey="__key"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Athlètes liés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="search"
                placeholder="Rechercher un athlète..."
                value={athleteSearch}
                onChange={(event) => setAthleteSearch(event.target.value)}
                className="max-w-sm"
              />
              <Select value={athleteStatus} onValueChange={setAthleteStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={athleteSexe} onValueChange={setAthleteSexe}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sexe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sexes</SelectItem>
                  <SelectItem value="masculin">Masculin</SelectItem>
                  <SelectItem value="féminin">Féminin</SelectItem>
                  <SelectItem value="feminin">Feminin</SelectItem>
                  <SelectItem value="m">M</SelectItem>
                  <SelectItem value="f">F</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Équipe</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Sexe</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {athletesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Chargement des athlètes...
                      </TableCell>
                    </TableRow>
                  ) : athletes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Aucun athlète trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    athletes.map((athlete) => (
                      <TableRow key={athlete.__key ?? athlete.id}>
                        <TableCell className="font-mono text-sm">{athlete.id}</TableCell>
                        <TableCell className="font-medium">
                          {athlete.prenom} {athlete.nom}
                        </TableCell>
                        <TableCell>{athlete.equipe}</TableCell>
                        <TableCell>{athlete.categorie || "Non définie"}</TableCell>
                        <TableCell>{athlete.sexe}</TableCell>
                        <TableCell>
                          <StatusBadge status={athlete.statut} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {athletePagination.total} résultat{athletePagination.total > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAthletePage((page) => Math.max(1, page - 1))}
                  disabled={athletePage <= 1 || athletesLoading}
                >
                  Précédent
                </Button>
                <span>
                  Page {athletePagination.page} sur {athletePagination.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAthletePage((page) => Math.min(athletePagination.totalPages || 1, page + 1))
                  }
                  disabled={
                    athletesLoading || athletePagination.page >= (athletePagination.totalPages || 1)
                  }
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
