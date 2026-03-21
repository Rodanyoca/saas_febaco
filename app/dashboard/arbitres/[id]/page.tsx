"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileDown, Flag, MapPin, Award } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { arbitres } from "@/lib/demo-data"

export default function ArbitreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const arbitre = arbitres.find((a) => a.id === params.id)

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
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Flag className="h-10 w-10 text-primary" />
                </div>
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
                <p className="text-sm text-muted-foreground">ID Arbitre</p>
                <p className="font-mono font-medium">{arbitre.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DetailCard
            title="Identite"
            icon={Flag}
            fields={[
              { label: "ID Arbitre", value: arbitre.id },
              { label: "Nom complet", value: `${arbitre.prenom} ${arbitre.nom}` },
              { label: "Sexe", value: arbitre.sexe === "M" ? "Masculin" : "Feminin" },
              { label: "Date de naissance", value: arbitre.dateNaissance },
              { label: "Nationalite", value: arbitre.nationalite },
            ]}
          />

          <DetailCard
            title="Profil d arbitrage"
            icon={Award}
            fields={[
              { label: "Niveau", value: arbitre.niveau },
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
