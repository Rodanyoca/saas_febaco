"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { ArrowLeft, Camera, FileDown, Flag, MapPin, Award } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { arbitres } from "@/lib/demo-data"

function formatMatricule(value: unknown): string {
  const raw = String(value ?? "").trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) return raw
  return digits.slice(-3).padStart(3, "0")
}

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "AR"
}

export default function ArbitreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const arbitre = arbitres.find((a) => a.id === params.id)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)

  const avatarSrc = localAvatarUrl || arbitre?.avatarUrl || null

  const matricule = useMemo(() => formatMatricule(arbitre?.id), [arbitre?.id])

  if (!arbitre) {
    return (
      <div className="flex flex-col">
        <Header title="Arbitre non trouve" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">L arbitre demande n existe pas.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  const handleExportPDF = () => {
    alert("Export PDF - Cette fonctionnalite sera connectee a l API")
  }

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Arbitre: ${arbitre.prenom} ${arbitre.nom}`} />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour a la liste
          </Button>
          <Button onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={`${arbitre.prenom} ${arbitre.nom}`} />
                  <AvatarFallback className="text-lg">{initials(arbitre.prenom, arbitre.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {arbitre.prenom} {arbitre.nom}
                  </h2>
                  <p className="text-muted-foreground">Niveau {arbitre.niveau}</p>
                  <p className="text-sm text-muted-foreground">{arbitre.ligue}</p>
                  <div className="mt-2">
                    <StatusBadge status={arbitre.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Matricule</p>
                <p className="font-mono font-medium">{matricule}</p>
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DetailCard
            title="Identite"
            icon={Flag}
            fields={[
              { label: "Matricule", value: matricule },
              { label: "Nom complet", value: `${arbitre.prenom} ${arbitre.nom}` },
              { label: "Sexe", value: arbitre.sexe === "M" ? "Masculin" : "Feminin" },
              { label: "Date de naissance", value: arbitre.dateNaissance },
              { label: "Nationalite", value: arbitre.nationalite },
              { label: "Telephone", value: arbitre.telephone },
              { label: "Email", value: arbitre.email },
            ]}
          />

          <DetailCard
            title="Profil d arbitrage"
            icon={Award}
            fields={[
              { label: "Niveau", value: arbitre.niveau },
              { label: "Taille", value: arbitre.tailleCm ? `${arbitre.tailleCm} cm` : "-" },
              { label: "Poids", value: arbitre.poidsKg ? `${arbitre.poidsKg} kg` : "-" },
              { label: "Statut", value: arbitre.statut },
            ]}
          />

          <DetailCard
            title="Rattachement territorial"
            icon={MapPin}
            fields={[
              { label: "Province", value: arbitre.province },
              { label: "Ligue", value: arbitre.ligue },
              { label: "Entente", value: arbitre.entente },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
