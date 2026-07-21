"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Medecin, MedecinAffiliation } from "@/lib/models"
import { ArrowLeft, Camera, Stethoscope, MapPin, Activity } from "lucide-react"

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

function display(value: unknown): string {
  const raw = String(value ?? "").trim()
  return raw && raw !== "-" ? raw : "-"
}

export default function MedecinDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [medecins, setMedecins] = useState<Medecin[]>([])
  const [affiliations, setAffiliations] = useState<MedecinAffiliation[]>([])
  const [affiliationsLoading, setAffiliationsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/medecins", { cache: "no-store" })
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
  }, [])

  async function reloadMedecins() {
    const res = await fetch("/api/medecins", { cache: "no-store" })
    const json = await res.json()
    setMedecins(Array.isArray(json?.medecins) ? json.medecins : [])
  }

  const medecin = useMemo(() => {
    if (!idParam) return undefined
    return medecins.find(
      (m) => String(m.id) === String(idParam) || String((m as unknown as { __key?: unknown }).__key) === String(idParam)
    )
  }, [medecins, idParam])

  const avatarSrc = localAvatarUrl || medecin?.avatarUrl || null
  const code = useMemo(() => formatCode(medecin?.id), [medecin?.id])

  useEffect(() => {
    if (!medecin) {
      setAffiliations([])
      return
    }

    let canceled = false
    ;(async () => {
      setAffiliationsLoading(true)
      try {
        const query = new URLSearchParams({ medecinId: medecin.id })
        const res = await fetch(`/api/medecin-affiliations?${query.toString()}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setAffiliations(Array.isArray(json?.affiliations) ? json.affiliations : [])
        }
      } catch {
        if (!canceled) setAffiliations([])
      } finally {
        if (!canceled) setAffiliationsLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [medecin])

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

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Médecin: ${medecin.prenom} ${medecin.nom}`} />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setAvatarModalOpen(true)}>
                    <Camera className="mr-2 h-4 w-4" />
                    Ajouter la photo
                  </Button>
                </div>
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
            { label: "Nom", value: `${medecin.prenom} ${medecin.nom}` },
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

            const url = String(json?.avatar_drive_url ?? "")
            if (!url) {
              throw new Error("Upload avatar échoué")
            }

            setLocalAvatarUrl(url)
            await reloadMedecins()
            return url
          }}
        />

        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="general" className="w-full">
              Général
            </TabsTrigger>
            <TabsTrigger value="affiliation" className="w-full">
              Affiliation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
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
          </TabsContent>

          <TabsContent value="affiliation">
            <Card>
              <CardHeader>
                <CardTitle>Historique des affiliations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Saison</TableHead>
                        <TableHead>Équipe</TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead>Fonction</TableHead>
                        <TableHead>Date de début</TableHead>
                        <TableHead>Date de fin</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {affiliationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Chargement des affiliations...
                          </TableCell>
                        </TableRow>
                      ) : affiliations.length > 0 ? (
                        affiliations.map((affiliation) => (
                          <TableRow key={affiliation.__key ?? affiliation.id}>
                            <TableCell>{display(affiliation.saison)}</TableCell>
                            <TableCell>{display(affiliation.equipeNom)}</TableCell>
                            <TableCell>{display(affiliation.clubNom)}</TableCell>
                            <TableCell>{display(affiliation.fonction)}</TableCell>
                            <TableCell>{display(affiliation.dateDebut)}</TableCell>
                            <TableCell>{display(affiliation.dateFin)}</TableCell>
                            <TableCell><StatusBadge status={affiliation.statut} /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Aucune affiliation enregistrée.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
