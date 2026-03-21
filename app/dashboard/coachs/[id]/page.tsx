"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { coachs } from "@/lib/demo-data"
import { ArrowLeft, FileDown, UserCog, MapPin, Award } from "lucide-react"

export default function CoachDetailPage() {
  const params = useParams()
  const router = useRouter()
  const coach = coachs.find((c) => c.id === params.id)

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

  const handleExportPDF = () => {
    alert("Export PDF - Cette fonctionnalité sera connectée à l'API")
  }

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Entraîneur: ${coach.prenom} ${coach.nom}`} />

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
                  <UserCog className="h-10 w-10 text-primary" />
                </div>
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
              </div>
            </div>
          </CardContent>
        </Card>

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
