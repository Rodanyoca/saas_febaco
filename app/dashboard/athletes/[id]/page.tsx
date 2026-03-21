"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { athletes } from "@/lib/demo-data"
import { ArrowLeft, FileDown, User, MapPin, Trophy, Info } from "lucide-react"

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athlete = athletes.find((a) => a.id === params.id)

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

  const handleExportPDF = () => {
    alert("Export PDF - Cette fonctionnalité sera connectée à l'API")
  }

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Athlète: ${athlete.prenom} ${athlete.nom}`} />

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

        {/* Athlete header card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-10 w-10 text-primary" />
                </div>
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
