"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Layers, MapPin, Shield } from "lucide-react"

import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { FederalEditLink } from "@/components/dashboard/federal-edit-link"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Club, Entente, Ligue } from "@/lib/models"

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const [liguesRes, ententesRes, clubsRes] = await Promise.all([
          fetch("/api/ligues", { cache: "no-store" }),
          fetch("/api/ententes", { cache: "no-store" }),
          fetch("/api/clubs", { cache: "no-store" }),
        ])

        const [liguesJson, ententesJson, clubsJson] = await Promise.all([
          liguesRes.json(),
          ententesRes.json(),
          clubsRes.json(),
        ])

        if (!canceled) {
          setLigues(Array.isArray(liguesJson?.ligues) ? liguesJson.ligues : [])
          setEntentes(Array.isArray(ententesJson?.ententes) ? ententesJson.ententes : [])
          setClubs(Array.isArray(clubsJson?.clubs) ? clubsJson.clubs : [])
        }
      } catch {
        if (!canceled) {
          setLigues([])
          setEntentes([])
          setClubs([])
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
              { label: "Année de création", value: ligue.anneeCreation },
              { label: "Date d’affiliation", value: ligue.dateAffiliation },
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

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard title="Ententes liées" value={relatedEntentes.length} icon={Layers} />
          <StatCard title="Clubs liés" value={relatedClubs.length} icon={Building2} />
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

      </div>
    </div>
  )
}
