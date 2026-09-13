"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Briefcase, CalendarDays, Layers, Pencil, Plus, Shield, Users } from "lucide-react"

import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { FederalEditLink } from "@/components/dashboard/federal-edit-link"
import { EquipeFormModal } from "@/components/dashboard/equipe-form-modal"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import type { Arbitre, Athlete, Club, Coach, Equipe, Medecin, Officiel } from "@/lib/models"

type AthletePagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type StaffMember = {
  key: string
  type: string
  nom: string
  fonction: string
  telephone?: string
  email?: string
  statut: string
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function isSet(value: unknown): boolean {
  const normalized = normalize(value)
  return Boolean(normalized && normalized !== "-")
}

function same(value: unknown, expected: unknown): boolean {
  return isSet(value) && isSet(expected) && normalize(value) === normalize(expected)
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || String(value).trim() === "") continue
    query.set(key, String(value))
  }
  return query.toString()
}

async function loadList<T>(url: string, key: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    const json = await res.json()
    return Array.isArray(json?.[key]) ? json[key] : []
  } catch {
    return []
  }
}

function getFullName(person: { prenom?: string; nom?: string }): string {
  return [person.prenom, person.nom].filter((part) => isSet(part)).join(" ") || "-"
}

function clubInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL"
}

const equipeColumns: Column<Equipe>[] = [
  { key: "id", header: "ID équipe", className: "font-mono text-sm" },
  { key: "nom", header: "Équipe", className: "font-medium" },
  { key: "categorie", header: "Catégorie" },
  { key: "genre", header: "Genre" },
  { key: "saison", header: "Saison", render: (item) => item.saison || "-" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

const staffColumns: Column<StaffMember>[] = [
  { key: "type", header: "Type" },
  { key: "nom", header: "Nom", className: "font-medium" },
  { key: "fonction", header: "Fonction" },
  { key: "telephone", header: "Téléphone", render: (item) => item.telephone || "-" },
  { key: "email", header: "Email", render: (item) => item.email || "-" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
]

export default function ClubDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [clubs, setClubs] = useState<Club[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [coachs, setCoachs] = useState<Coach[]>([])
  const [medecins, setMedecins] = useState<Medecin[]>([])
  const [officiels, setOfficiels] = useState<Officiel[]>([])
  const [arbitres, setArbitres] = useState<Arbitre[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [affiliatedStaff, setAffiliatedStaff] = useState<StaffMember[]>([])
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
  const [canEdit, setCanEdit] = useState(false)
  const [equipeModalOpen, setEquipeModalOpen] = useState(false)
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      const [clubsData, equipesData, coachsData, medecinsData, officielsData, arbitresData] =
        await Promise.all([
          loadList<Club>("/api/clubs", "clubs"),
          loadList<Equipe>("/api/equipes", "equipes"),
          loadList<Coach>("/api/coachs", "coachs"),
          loadList<Medecin>("/api/medecins", "medecins"),
          loadList<Officiel>("/api/officiels", "officiels"),
          loadList<Arbitre>("/api/arbitres", "arbitres"),
        ])

      if (!canceled) {
        setClubs(clubsData)
        setEquipes(equipesData)
        setCoachs(coachsData)
        setMedecins(medecinsData)
        setOfficiels(officielsData)
        setArbitres(arbitresData)
        setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    void fetch("/api/auth/me").then((response) => response.json()).then((payload) => setCanEdit(payload?.user?.role === "federal")).catch(() => setCanEdit(false))
  }, [])

  const reloadEquipes = async () => {
    setEquipes(await loadList<Equipe>("/api/equipes", "equipes"))
  }

  const club = useMemo(() => {
    if (!idParam) return undefined
    return clubs.find((item) => same(item.id, idParam))
  }, [clubs, idParam])

  const clubEquipes = useMemo(() => {
    if (!club) return []
    return equipes.filter((equipe) => {
      return same(equipe.clubId, club.id)
    })
  }, [club, equipes])

  const equipeIds = useMemo(() => {
    return clubEquipes
      .map((equipe) => String(equipe.id ?? "").trim())
      .filter((id) => id && id !== "-")
  }, [clubEquipes])

  const equipeIdsKey = equipeIds.join(",")

  const isLinkedToClub = (item: {
    clubId?: string
    equipeId?: string
    club?: string
    equipe?: string
  }) => {
    if (!club) return false
    if (same(item.clubId, club.id)) return true
    if (item.equipeId && equipeIds.some((id) => same(item.equipeId, id))) return true
    return false
  }

  const linkedCoachs = useMemo(() => coachs.filter(isLinkedToClub), [coachs, club, equipeIdsKey])
  const linkedMedecins = useMemo(() => medecins.filter(isLinkedToClub), [medecins, club, equipeIdsKey])
  const linkedOfficiels = useMemo(() => officiels.filter(isLinkedToClub), [officiels, club, equipeIdsKey])
  const linkedArbitres = useMemo(() => arbitres.filter(isLinkedToClub), [arbitres, club, equipeIdsKey])

  const staffMembers: StaffMember[] = useMemo(() => {
    return [
      ...linkedCoachs.map((item) => ({
        key: `coach-${item.__key ?? item.id}`,
        type: "Coach",
        nom: getFullName(item),
        fonction: item.specialite || item.niveau || "-",
        telephone: item.telephone,
        email: item.email,
        statut: item.statut,
      })),
      ...linkedMedecins.map((item) => ({
        key: `medecin-${item.__key ?? item.id}`,
        type: "Médecin",
        nom: getFullName(item),
        fonction: item.specialite || item.structureMedicale || "-",
        telephone: item.telephone,
        email: item.email,
        statut: item.statut,
      })),
      ...linkedOfficiels.map((item) => ({
        key: `officiel-${item.__key ?? item.id}`,
        type: "Officiel",
        nom: getFullName(item),
        fonction: item.fonction || "-",
        telephone: item.telephone,
        email: item.email,
        statut: item.statut,
      })),
      ...linkedArbitres.map((item) => ({
        key: `arbitre-${item.__key ?? item.id}`,
        type: "Arbitre",
        nom: getFullName(item),
        fonction: item.niveau || "-",
        telephone: item.telephone,
        email: item.email,
        statut: item.statut,
      })),
    ]
  }, [linkedArbitres, linkedCoachs, linkedMedecins, linkedOfficiels])

  useEffect(() => {
    setAthletePage(1)
  }, [athleteSearch, athleteSexe, athleteStatus, equipeIdsKey])

  useEffect(() => {
    if (!club) return
    let canceled = false
    void Promise.all([fetch(`/api/affiliations/coach?clubId=${encodeURIComponent(club.id)}`, { cache: "no-store" }).then((response) => response.json()), fetch(`/api/affiliations/medecin?clubId=${encodeURIComponent(club.id)}`, { cache: "no-store" }).then((response) => response.json()), fetch(`/api/affiliations/officiel?typeEntiteId=STR003&entiteId=${encodeURIComponent(club.id)}`, { cache: "no-store" }).then((response) => response.json())])
      .then(([coaches, doctors, officials]) => {
        if (canceled) return
        const map = (rows: Record<string, string>[], type: string) => (rows || []).map((row) => ({ key: `${type}-${row.id}`, type, nom: row.nomActeur || "Référence inconnue", fonction: row.fonction || "-", statut: row.statut || "-" }))
        setAffiliatedStaff([...map(coaches.affiliations, "Coach"), ...map(doctors.affiliations, "Médecin"), ...map(officials.affiliations, "Officiel")])
      }).catch(() => { if (!canceled) setAffiliatedStaff([]) })
    return () => { canceled = true }
  }, [club])

  useEffect(() => {
    if (!club) {
      setAthletes([])
      setAthletePagination({ page: 1, pageSize: 25, total: 0, totalPages: 1 })
      return
    }

    let canceled = false
    ;(async () => {
      setAthletesLoading(true)
      try {
        const query = buildQuery({
          clubId: club.id,
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
  }, [athletePage, athleteSearch, athleteSexe, athleteStatus, club, equipeIdsKey])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6 text-muted-foreground">Chargement du club...</div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="flex flex-col">
        <Header title="Club non trouvé" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Le club demandé n'existe pas.</p>
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
      <Header title={`Fiche Club: ${club.nom}`} subtitle={club.entente || club.ligue || ""} />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-3"><Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />Retour à la liste
        </Button><FederalEditLink href={`/dashboard/clubs?edit=${encodeURIComponent(club.id)}`} /></div>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Avatar className="size-20 shrink-0 rounded-xl border bg-background shadow-sm">
              <AvatarImage src={club.logoUrl || undefined} alt={`Logo de ${club.nom}`} className="object-contain p-2" />
              <AvatarFallback className="rounded-xl text-lg font-semibold">{clubInitials(club.nom)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">{club.nom}</h2>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{club.id}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard
            title="Informations générales"
            icon={Shield}
            fields={[
              { label: "ID Club", value: club.id },
              { label: "Nom du club", value: club.nom },
              { label: "Ligue", value: club.ligue },
              { label: "Entente", value: club.entente },
              { label: "Statut", value: club.statut },
              { label: "Observation", value: club.observation || "-" },
            ]}
          />

          <DetailCard
            title="Affiliation"
            icon={CalendarDays}
            fields={[
              { label: "Catégorie", value: club.categorie },
              { label: "Version", value: club.version },
              { label: "Date d'affiliation", value: club.dateAffiliation },
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatTile icon={Layers} label="Équipes" value={clubEquipes.length} />
          <StatTile icon={Users} label="Athlètes" value={athletePagination.total} />
          <StatTile icon={Briefcase} label="Coachs" value={linkedCoachs.length} />
          <StatTile icon={Shield} label="Médecins" value={linkedMedecins.length} />
          <StatTile icon={CalendarDays} label="Compétitions" value="En cours" />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Équipes du club</CardTitle>
            {canEdit ? <Button size="sm" onClick={() => { setEditingEquipe(null); setEquipeModalOpen(true) }}><Plus className="mr-2 h-4 w-4" />Créer une équipe</Button> : null}
          </CardHeader>
          <CardContent>
            <DataTable
              data={clubEquipes}
              columns={equipeColumns}
              searchPlaceholder="Rechercher une équipe..."
              idKey="__key"
              detailHref={(equipe) => `/dashboard/equipes/${encodeURIComponent(equipe.id)}`}
              renderActions={canEdit ? (equipe) => <Button variant="ghost" size="icon-sm" title="Modifier" aria-label={`Modifier ${equipe.nom}`} onClick={() => { setEditingEquipe(equipe); setEquipeModalOpen(true) }}><Pencil className="h-4 w-4" /></Button> : undefined}
            />
          </CardContent>
        </Card>

        <EquipeFormModal open={equipeModalOpen} onOpenChange={setEquipeModalOpen} clubId={club.id} equipe={editingEquipe} onSaved={reloadEquipes} />

        <Card>
          <CardHeader>
            <CardTitle>Athlètes du club</CardTitle>
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
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="SAF001">Actif</SelectItem>
                  <SelectItem value="SAF002">Terminé</SelectItem>
                  <SelectItem value="SAF003">Suspendu</SelectItem>
                  <SelectItem value="SAF004">Annulé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={athleteSexe} onValueChange={setAthleteSexe}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les genres</SelectItem>
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
                    <TableHead>ID athlète</TableHead>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>ID équipe</TableHead>
                    <TableHead>Équipe</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {athletesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Chargement des athlètes...
                      </TableCell>
                    </TableRow>
                  ) : athletes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                        <TableCell>{athlete.sexe}</TableCell>
                        <TableCell>{athlete.categorie || "Non définie"}</TableCell>
                        <TableCell className="font-mono text-sm">{athlete.equipeId || "-"}</TableCell>
                        <TableCell>{athlete.equipe}</TableCell>
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

        <Card>
          <CardHeader>
            <CardTitle>Staff / entourage du club</CardTitle>
          </CardHeader>
          <CardContent>
            {affiliatedStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground">En cours de synchronisation.</p>
            ) : (
              <DataTable
                data={affiliatedStaff}
                columns={staffColumns}
                searchPlaceholder="Rechercher dans le staff..."
                idKey="key"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compétitions liées au club</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              En cours de synchronisation. Les compétitions seront rattachées via les équipes du club.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-6 w-6 text-primary" />
      </CardContent>
    </Card>
  )
}
