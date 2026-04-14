"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Athlete } from "@/lib/demo-data"
import { useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera, User, MapPin, Trophy, Info } from "lucide-react"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "AT"
}

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()

  const athleteId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) return raw[0]
    return typeof raw === "string" ? raw : ""
  }, [params])

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)

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
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const athlete = useMemo(() => {
    if (!athleteId) return undefined
    return athletes.find((a) => a.id === athleteId || a.__key === athleteId)
  }, [athletes, athleteId])

  const avatarSrc = localAvatarUrl || (athlete?.avatarUrl as string | undefined) || null

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Chargement de la fiche athlète.</p>
        </div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="flex flex-col">
        <Header title="Athlète non trouvé" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">L'athlète demandé n'existe pas.</p>
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
      <Header title={`Fiche Athlète: ${athlete.prenom} ${athlete.nom}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </div>

        {/* Athlete header card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={`${athlete.prenom} ${athlete.nom}`} />
                  <AvatarFallback className="text-lg">{initials(athlete.prenom, athlete.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {athlete.prenom} {athlete.nom}
                  </h2>
                  <p className="text-muted-foreground">
                    {athlete.poste} - N°{athlete.numeroMaillot}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {athlete.club} / {athlete.equipe}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={athlete.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ID Athlète</p>
                <p className="font-mono font-medium">{athlete.id}</p>
                <div className="mt-3 flex justify-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      setLocalAvatarUrl(url)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Ajouter la photo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Identité */}
          <DetailCard
            title="Identité"
            icon={User}
            fields={[
              { label: "ID Athlète", value: athlete.id },
              { label: "Nom complet", value: `${athlete.prenom} ${athlete.nom}` },
              { label: "Sexe", value: athlete.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: athlete.dateNaissance },
              { label: "Lieu de naissance", value: athlete.lieuNaissance },
              { label: "Nationalité", value: athlete.nationalite },
            ]}
          />

          {/* Appartenance sportive */}
          <DetailCard
            title="Appartenance sportive"
            icon={MapPin}
            fields={[
              { label: "Province", value: athlete.province },
              { label: "Ligue", value: athlete.ligue },
              { label: "Entente", value: athlete.entente },
              { label: "Club", value: athlete.club },
              { label: "Équipe", value: athlete.equipe },
            ]}
          />

          {/* Informations sportives */}
          <DetailCard
            title="Informations sportives"
            icon={Trophy}
            fields={[
              { label: "Catégorie", value: athlete.categorie },
              { label: "Numéro de maillot", value: athlete.numeroMaillot },
              { label: "Poste", value: athlete.poste },
              { label: "Statut", value: athlete.statut },
            ]}
          />

          {/* Observations */}
          <DetailCard
            title="Observations"
            icon={Info}
            fields={[
              { label: "Remarques", value: "Aucune remarque enregistrée" },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
