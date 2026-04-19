"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Athlete, Club, Equipe } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import { ArrowLeft, Camera, Shield, MapPin, Users, Layers } from "lucide-react"

function initials(nom?: string): string {
  const n = String(nom ?? "").trim()
  const a = n ? n[0] : ""
  return (a || "CL").toUpperCase()
}

export default function ClubDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [clubs, setClubs] = useState<Club[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

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

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/athletes", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setAthletes(Array.isArray(json?.athletes) ? json.athletes : [])
        }
      } catch {
        if (!canceled) setAthletes([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const reloadClubs = async () => {
    try {
      const res = await fetch("/api/clubs", { cache: "no-store" })
      const json = await res.json()
      setClubs(Array.isArray(json?.clubs) ? json.clubs : [])
    } catch {
      setClubs([])
    }
  }

  const club = useMemo(() => {
    if (!idParam) return undefined
    return clubs.find((c) => String(c.id) === String(idParam))
  }, [clubs, idParam])

  const avatarSrc = localAvatarUrl || (club?.avatarUrl as string | undefined) || null

  const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase()

  const clubEquipes = useMemo(() => {
    const clubName = normalize(club?.nom)
    if (!clubName) return []

    return equipes.filter((e) => normalize(e.club) === clubName)
  }, [club?.nom, equipes])

  const clubAthletes = useMemo(() => {
    const clubName = normalize(club?.nom)
    if (!clubName) return []

    return athletes.filter((a) => normalize(a.club) === clubName)
  }, [athletes, club?.nom])

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

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Club: ${club.nom}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </div>

        {/* Club header card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-xl">
                  <AvatarImage src={avatarSrc || undefined} alt={club.nom} />
                  <AvatarFallback className="rounded-xl">{initials(club.nom)}</AvatarFallback>
                </Avatar>
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
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAvatarModalOpen(true)}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Ajouter la photo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <AvatarUploadModal
          open={avatarModalOpen}
          onOpenChange={setAvatarModalOpen}
          title="Ajouter la photo"
          description="Vérifie les informations avant de confirmer la photo."
          currentImageUrl={avatarSrc}
          fallbackText={initials(club.nom)}
          verificationFields={[
            { label: "Nom", value: club.nom },
            { label: "Catégorie", value: club.categorie },
          ]}
          onConfirm={(url) => setLocalAvatarUrl(url)}
          onConfirmFile={async (file) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("entityType", "club")
            formData.append("entityId", String(club.id))

            const res = await fetch("/api/upload/avatar", {
              method: "POST",
              body: formData,
            })

            const json = await res.json()
            if (!res.ok) {
              throw new Error(String(json?.error ?? "Upload avatar échoué"))
            }

            const url = String(json?.avatar_drive_url ?? "")
            if (!url) {
              throw new Error("Upload avatar échoué")
            }

            setLocalAvatarUrl(url)
            await reloadClubs()
            return url
          }}
        />

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
              { label: "Nombre d'équipes", value: clubEquipes.length },
              { label: "Nombre d'athlètes", value: clubAthletes.length },
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
