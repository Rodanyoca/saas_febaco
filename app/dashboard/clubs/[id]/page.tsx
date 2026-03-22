"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Club, Equipe } from "@/lib/demo-data"
import { ArrowLeft, FileDown, Shield, MapPin, Users, Layers } from "lucide-react"

export default function ClubDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [clubs, setClubs] = useState<Club[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/clubs", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setClubs(Array.isArray(json?.clubs) ? json.clubs : [])
        }
      } catch {
        if (!canceled) setClubs([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/equipes", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setEquipes(Array.isArray(json?.equipes) ? json.equipes : [])
        }
      } catch {
        if (!canceled) setEquipes([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const club = useMemo(() => {
    if (!idParam) return undefined
    return clubs.find((c) => String(c.id) === String(idParam))
  }, [clubs, idParam])

  const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase()

  const clubEquipes = useMemo(() => {
    const clubName = normalize(club?.nom)
    if (!clubName) return []

    return equipes.filter((e) => normalize(e.club) === clubName)
  }, [club?.nom, equipes])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Chargement du club...</p>
        </div>
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

  const handleExportPDF = () => {
    // Placeholder for PDF export
    alert("Export PDF - Cette fonctionnalité sera connectée à l'API")
  }

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Club: ${club.nom}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
          <Button onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>
        </div>

        {/* Club header card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{club.nom}</h2>
                  <p className="text-muted-foreground">{club.categorie}</p>
                  <div className="mt-2">
                    <StatusBadge status={club.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ID Club</p>
                <p className="font-mono font-medium">{club.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Identité */}
          <DetailCard
            title="Identité"
            icon={Shield}
            fields={[
              { label: "ID Club", value: club.id },
              { label: "Nom du club", value: club.nom },
              { label: "Catégorie", value: club.categorie },
              { label: "Date d'affiliation", value: club.dateAffiliation ?? "-" },
              { label: "Statut", value: club.statut },
            ]}
          />

          {/* Rattachement territorial */}
          <DetailCard
            title="Rattachement territorial"
            icon={MapPin}
            fields={[
              { label: "Province", value: club.province },
              { label: "Ligue", value: club.ligue },
              { label: "Entente", value: club.entente },
            ]}
          />

          {/* Effectif */}
          <DetailCard
            title="Effectif sportif"
            icon={Users}
            fields={[
              { label: "Nombre d'équipes", value: club.nombreEquipes },
              { label: "Nombre d'athlètes", value: club.nombreAthletes },
            ]}
          />
        </div>

        {/* Equipes list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              Équipes du club ({clubEquipes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clubEquipes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune équipe enregistrée pour ce club.
              </p>
            ) : (
              <div className="space-y-2">
                {clubEquipes.map((equipe) => (
                  <div
                    key={(equipe as unknown as { __key?: string }).__key ?? equipe.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{equipe.nom}</p>
                        <p className="text-sm text-muted-foreground">
                          {equipe.categorie} - {equipe.genre}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={equipe.statut} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
