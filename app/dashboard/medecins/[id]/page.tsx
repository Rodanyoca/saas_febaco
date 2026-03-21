"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { medecins } from "@/lib/demo-data"
import { ArrowLeft, FileDown, Stethoscope, MapPin, Activity } from "lucide-react"

export default function MedecinDetailPage() {
  const params = useParams()
  const router = useRouter()
  const medecin = medecins.find((m) => m.id === params.id)

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
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Stethoscope className="h-10 w-10 text-primary" />
                </div>
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
                <p className="text-sm text-muted-foreground">ID Médecin</p>
                <p className="font-mono font-medium">{medecin.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DetailCard
            title="Identité"
            icon={Stethoscope}
            fields={[
              { label: "ID Médecin", value: medecin.id },
              { label: "Nom complet", value: `${medecin.prenom} ${medecin.nom}` },
              { label: "Sexe", value: medecin.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: medecin.dateNaissance },
              { label: "Nationalité", value: medecin.nationalite },
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
