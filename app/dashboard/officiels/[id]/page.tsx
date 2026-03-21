"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { officiels } from "@/lib/demo-data"
import { ArrowLeft, FileDown, BadgeCheck, MapPin, Briefcase } from "lucide-react"

export default function OfficielDetailPage() {
  const params = useParams()
  const router = useRouter()
  const officiel = officiels.find((o) => o.id === params.id)

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
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <BadgeCheck className="h-10 w-10 text-primary" />
                </div>
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
                <p className="text-sm text-muted-foreground">ID Officiel</p>
                <p className="font-mono font-medium">{officiel.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DetailCard
            title="Identité"
            icon={BadgeCheck}
            fields={[
              { label: "ID Officiel", value: officiel.id },
              { label: "Nom complet", value: `${officiel.prenom} ${officiel.nom}` },
              { label: "Sexe", value: officiel.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: officiel.dateNaissance },
              { label: "Nationalité", value: officiel.nationalite },
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
