"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import { Coach } from "@/lib/models"
import { ArrowLeft, Camera, UserCog, MapPin, Award } from "lucide-react"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "EN"
}

export default function CoachDetailPage() {
  const params = useParams()
  const router = useRouter()

  const coachId = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [coachs, setCoachs] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const reloadCoachs = async () => {
    try {
      const res = await fetch("/api/coachs", { cache: "no-store" })
      const json = await res.json()
      setCoachs(Array.isArray(json?.coachs) ? json.coachs : [])
    } catch {
      setCoachs([])
    }
  }

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/coachs", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setCoachs(Array.isArray(json?.coachs) ? json.coachs : [])
        }
      } catch {
        if (!canceled) setCoachs([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const coach = useMemo(() => {
    if (!coachId) return undefined
    return coachs.find((c) => String(c.id) === String(coachId) || String((c as unknown as { __key?: unknown }).__key) === String(coachId))
  }, [coachs, coachId])

  const avatarSrc = localAvatarUrl || (coach as unknown as { avatarUrl?: string })?.avatarUrl || null

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Chargement de la fiche entraîneur.</p>
        </div>
      </div>
    )
  }

  if (!coach) {
    return (
      <div className="flex flex-col">
        <Header title="Entraîneur non trouvé" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">L'entraîneur demandé n'existe pas.</p>
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
      <Header title={`Fiche Entraîneur: ${coach.prenom} ${coach.nom}`} />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={`${coach.prenom} ${coach.nom}`} />
                  <AvatarFallback className="text-lg">{initials(coach.prenom, coach.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {coach.prenom} {coach.nom}
                  </h2>
                  <p className="text-muted-foreground">
                    {coach.niveau} - {coach.specialite}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {coach.club} / {coach.equipe}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={coach.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ID Coach</p>
                <p className="font-mono font-medium">{coach.id}</p>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAvatarModalOpen(true)}>
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
          fallbackText={initials(coach.prenom, coach.nom)}
          verificationFields={[
            { label: "Nom", value: `${coach.prenom} ${coach.nom}` },
            { label: "Sexe", value: coach.sexe === "M" ? "Masculin" : "Féminin" },
          ]}
          dateNaissanceForAge={coach.dateNaissance}
          onConfirm={(url) => setLocalAvatarUrl(url)}
          onConfirmFile={async (file) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("entityType", "entraineur")
            formData.append("entityId", String(coach.id))

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
            await reloadCoachs()
            return url
          }}
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DetailCard
            title="Identité"
            icon={UserCog}
            fields={[
              { label: "ID Coach", value: coach.id },
              { label: "Nom complet", value: `${coach.prenom} ${coach.nom}` },
              { label: "Sexe", value: coach.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: coach.dateNaissance },
              { label: "Nationalité", value: coach.nationalite },
            ]}
          />

          <DetailCard
            title="Profil"
            icon={Award}
            fields={[
              { label: "Niveau", value: coach.niveau },
              { label: "Spécialité", value: coach.specialite },
              { label: "Statut", value: coach.statut },
            ]}
          />

          <DetailCard
            title="Rattachement"
            icon={MapPin}
            fields={[
              { label: "Province", value: coach.province },
              { label: "Ligue", value: coach.ligue },
              { label: "Entente", value: coach.entente },
              { label: "Club", value: coach.club },
              { label: "Équipe", value: coach.equipe },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
