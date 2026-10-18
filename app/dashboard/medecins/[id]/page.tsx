"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { AffiliationsPanel } from "@/components/dashboard/affiliations-panel"
import { ActorLicenseHistoryTable } from "@/components/dashboard/actor-license-history-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Medecin } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Camera, Contact, Fingerprint, Flag, Info } from "lucide-react"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "MD"
}

export default function MedecinDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [medecins, setMedecins] = useState<Medecin[]>([])
  const [loading, setLoading] = useState(true)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        if (!idParam) return
        const res = await fetch(`/api/medecins?id=${encodeURIComponent(idParam)}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setMedecins(Array.isArray(json?.medecins) ? json.medecins : [])
        }
      } catch {
        if (!canceled) setMedecins([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [idParam])

  async function reloadMedecins() {
    const res = await fetch(`/api/medecins?id=${encodeURIComponent(idParam ?? "")}`, { cache: "no-store" })
    const json = await res.json()
    setMedecins(Array.isArray(json?.medecins) ? json.medecins : [])
  }

  const medecin = useMemo(() => {
    if (!idParam) return undefined
    return medecins.find(
      (o) => String(o.id) === String(idParam) || String((o as unknown as { __key?: unknown }).__key) === String(idParam)
    )
  }, [medecins, idParam])

  const avatarSrc = localAvatarUrl || medecin?.avatarUrl || null

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Chargement de la fiche médecin.</p>
        </div>
      </div>
    )
  }

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

  const nomComplet = medecin.nomComplet || `${medecin.prenom} ${medecin.nom}`.trim()

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Médecin: ${nomComplet}`} />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
          <div className="ml-auto">
            <ActorEditor
              kind="medecins"
              actor={medecin as unknown as Record<string,string>}
              onSaved={() => { void reloadMedecins() }}
              formExtra={<div className="space-y-2"><p className="text-sm font-medium">Photo</p><Button type="button" variant="outline" onClick={() => setAvatarModalOpen(true)}><Camera className="mr-2 h-4 w-4" />Ajouter la photo</Button></div>}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={nomComplet} />
                  <AvatarFallback className="text-lg">{initials(medecin.prenom, medecin.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {nomComplet}
                  </h2>
                  <p className="text-muted-foreground">{medecin.idNational || medecin.id}</p>
                  <div className="mt-2">
                    <StatusBadge status={medecin.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Code Médecin</p>
                <p className="font-mono font-medium">{medecin.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <AvatarUploadModal
          open={avatarModalOpen}
          onOpenChange={setAvatarModalOpen}
          title="Ajouter la photo"
          description="Vérifie les informations avant de confirmer la photo."
          currentImageUrl={avatarSrc}
          fallbackText={initials(medecin.prenom, medecin.nom)}
          verificationFields={[
            { label: "Nom", value: nomComplet },
            { label: "Sexe", value: medecin.sexe === "M" ? "Masculin" : "Féminin" },
          ]}
          dateNaissanceForAge={medecin.dateNaissance}
          onConfirm={(url) => setLocalAvatarUrl(url)}
          onConfirmFile={async (file) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("entityType", "medecin")
            formData.append("entityId", String(medecin.id))

            const res = await fetch("/api/upload/avatar", {
              method: "POST",
              body: formData,
            })

            const json = await res.json()
            if (!res.ok) {
              throw new Error(String(json?.error ?? "Upload avatar échoué"))
            }

            const url = String(json?.avatarUrl ?? "")
            if (!url) {
              throw new Error("Upload avatar échoué")
            }

            setLocalAvatarUrl(url)
            await reloadMedecins()
            return url
          }}
        />

        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="general" className="w-full">Général</TabsTrigger>
            <TabsTrigger value="affiliation" className="w-full">Affiliations</TabsTrigger>
            <TabsTrigger value="licences" className="w-full">Licences</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6 md:grid-cols-2">
          <DetailCard
            title="Identité"
            icon={Flag}
            fields={[
              { label: "Nom complet", value: nomComplet },
              { label: "Sexe", value: medecin.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: medecin.dateNaissance },
              { label: "Lieu de naissance", value: medecin.lieuNaissance },
              { label: "Nationalité", value: medecin.nationalite },
              { label: "Spécialité", value: medecin.specialite },
            ]}
          />

          <DetailCard
            title="Identifiants"
            icon={Fingerprint}
            fields={[
              { label: "ID médecin", value: medecin.id },
              { label: "ID national", value: medecin.idNational },
              { label: "ID FIBA", value: medecin.idFiba },
              { label: "Statut", value: medecin.statut },
            ]}
          />

          <DetailCard
            title="Contact et rattachement"
            icon={Contact}
            fields={[
              { label: "Téléphone", value: medecin.telephone },
              { label: "Email", value: medecin.email },
              { label: "Adresse", value: medecin.adresse },
              { label: "Structure médicale", value: medecin.structureMedicale },
              { label: "Province", value: medecin.province },
              { label: "Ligue", value: medecin.ligue },
              { label: "Entente", value: medecin.entente },
              { label: "Club", value: medecin.club },
            ]}
          />
          <DetailCard
            title="Observations"
            icon={Info}
            fields={[{ label: "Remarques", value: medecin.observations || "Aucune remarque enregistrée" }]}
          />
            </div>
          </TabsContent>

          <TabsContent value="affiliation">
            <AffiliationsPanel kind="medecin" actorId={medecin.id} />
          </TabsContent>
          <TabsContent value="licences">
            <ActorLicenseHistoryTable actorId={medecin.id} typeId="TAC005" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
