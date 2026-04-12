"use client"

import { useParams, useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { officiels } from "@/lib/demo-data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera, FileDown, BadgeCheck, MapPin, Briefcase } from "lucide-react"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "OF"
}

export default function OfficielDetailPage() {
  const params = useParams()
  const router = useRouter()
  const officiel = officiels.find((o) => o.id === params.id)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)

  const avatarSrc = localAvatarUrl || officiel?.avatarUrl || null

  if (!officiel) {
    return (
      <div className="flex flex-col">
        <Header title="Officiel non trouvé" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">L'officiel demandé n'existe pas.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  const handleExportPDF = () => {
    alert("Export PDF - Cette fonctionnalité sera connectée à l'API")
  }

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Officiel: ${officiel.prenom} ${officiel.nom}`} />

      <div className="flex-1 p-6 space-y-6">
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={`${officiel.prenom} ${officiel.nom}`} />
                  <AvatarFallback className="text-lg">{initials(officiel.prenom, officiel.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {officiel.prenom} {officiel.nom}
                  </h2>
                  <p className="text-muted-foreground">{officiel.fonction}</p>
                  <p className="text-sm text-muted-foreground">{officiel.structure}</p>
                  <div className="mt-2">
                    <StatusBadge status={officiel.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Code Officiel</p>
                <p className="font-mono font-medium">{officiel.id}</p>
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
            title="Identité"
            icon={BadgeCheck}
            fields={[
              { label: "Code Officiel", value: officiel.id },
              { label: "Nom complet", value: `${officiel.prenom} ${officiel.nom}` },
              { label: "Sexe", value: officiel.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: officiel.dateNaissance },
              { label: "Nationalité", value: officiel.nationalite },
              { label: "Téléphone", value: officiel.telephone },
              { label: "Email", value: officiel.email },
            ]}
          />

          <DetailCard
            title="Fonction"
            icon={Briefcase}
            fields={[
              { label: "Fonction", value: officiel.fonction },
              { label: "Structure", value: officiel.structure },
              { label: "Statut", value: officiel.statut },
            ]}
          />

          <DetailCard
            title="Rattachement"
            icon={MapPin}
            fields={[
              { label: "Province", value: officiel.province },
              { label: "Ligue", value: officiel.ligue },
              { label: "Entente", value: officiel.entente },
              { label: "Club", value: officiel.club },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
