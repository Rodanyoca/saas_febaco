"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { medecins } from "@/lib/demo-data"
import { ArrowLeft, Camera, FileDown, Stethoscope, MapPin, Activity } from "lucide-react"

function formatCode(value: unknown): string {
  const raw = String(value ?? "").trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) return raw
  return digits.slice(-3).padStart(3, "0")
}

function initials(prenom?: string, nom?: string): string {
  const p0 = String(prenom ?? "").trim().replace(/^Dr\.?\s*/i, "")
  const n0 = String(nom ?? "").trim()
  const a = p0 ? p0[0] : ""
  const b = n0 ? n0[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "MD"
}

export default function MedecinDetailPage() {
  const params = useParams()
  const router = useRouter()
  const medecin = medecins.find((m) => m.id === params.id)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)

  const avatarSrc = localAvatarUrl || medecin?.avatarUrl || null
  const code = useMemo(() => formatCode(medecin?.id), [medecin?.id])

  if (!medecin) {
    return (
      <div className="flex flex-col">
        <Header title="Médecin non trouvé" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Le médecin demandé n'existe pas.</p>
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
      <Header title={`Fiche Médecin: ${medecin.prenom} ${medecin.nom}`} />

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
                  <AvatarImage src={avatarSrc || undefined} alt={`${medecin.prenom} ${medecin.nom}`} />
                  <AvatarFallback className="text-lg">{initials(medecin.prenom, medecin.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {medecin.prenom} {medecin.nom}
                  </h2>
                  <p className="text-muted-foreground">{medecin.specialite}</p>
                  <p className="text-sm text-muted-foreground">{medecin.structureMedicale}</p>
                  <div className="mt-2">
                    <StatusBadge status={medecin.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Code Médecin</p>
                <p className="font-mono font-medium">{code}</p>
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
            icon={Stethoscope}
            fields={[
              { label: "Code Médecin", value: code },
              { label: "Nom complet", value: `${medecin.prenom} ${medecin.nom}` },
              { label: "Sexe", value: medecin.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: medecin.dateNaissance },
              { label: "Nationalité", value: medecin.nationalite },
              { label: "Téléphone", value: medecin.telephone },
              { label: "Email", value: medecin.email },
            ]}
          />

          <DetailCard
            title="Profil"
            icon={Activity}
            fields={[
              { label: "Spécialité", value: medecin.specialite },
              { label: "Structure médicale", value: medecin.structureMedicale },
              { label: "Statut", value: medecin.statut },
            ]}
          />

          <DetailCard
            title="Rattachement"
            icon={MapPin}
            fields={[
              { label: "Province", value: medecin.province },
              { label: "Ligue", value: medecin.ligue },
              { label: "Entente", value: medecin.entente },
              { label: "Club", value: medecin.club },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
