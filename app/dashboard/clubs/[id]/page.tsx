"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { clubs, athletes } from "@/lib/demo-data"
import { ArrowLeft, FileDown, Shield, MapPin, Users, Layers } from "lucide-react"
import Link from "next/link"

export default function ClubDetailPage() {
  const params = useParams()
  const router = useRouter()
  const club = clubs.find((c) => c.id === params.id)

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

  // Get athletes for this club
  const clubAthletes = athletes.filter((a) => a.club === club.nom)

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

        {/* Athletes list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              Athlètes du club ({clubAthletes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clubAthletes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun athlète enregistré pour ce club.
              </p>
            ) : (
              <div className="space-y-2">
                {clubAthletes.map((athlete) => (
                  <Link
                    key={athlete.id}
                    href={`/dashboard/athletes/${athlete.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {athlete.prenom} {athlete.nom}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {athlete.equipe} - {athlete.poste}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={athlete.statut} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
