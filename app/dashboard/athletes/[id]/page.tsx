"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Camera, Contact, Fingerprint, Info, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { AffiliationsPanel } from "@/components/dashboard/affiliations-panel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Athlete, AthleteLicence, Transfert } from "@/lib/models"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  return `${p ? p[0] : ""}${n ? n[0] : ""}`.toUpperCase() || "AT"
}

function display(value: unknown): string {
  const raw = String(value ?? "").trim()
  return raw && raw !== "-" ? raw : "-"
}

const displaySync = display

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) return raw[0]
    return typeof raw === "string" ? raw : ""
  }, [params])

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [licences, setLicences] = useState<AthleteLicence[]>([])
  const [licencesLoading, setLicencesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const transferts: Transfert[] = []
  const transfertsLoading = false

  const reloadAthletes = async () => {
    try {
      const res = await fetch(`/api/athletes?id=${encodeURIComponent(athleteId)}`, { cache: "no-store" })
      const json = await res.json()
      setAthletes(Array.isArray(json?.athletes) ? json.athletes : [])
    } catch {
      setAthletes([])
    }
  }

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        if (!athleteId) return
        const res = await fetch(`/api/athletes?id=${encodeURIComponent(athleteId)}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setAthletes(Array.isArray(json?.athletes) ? json.athletes : [])
        }
      } catch {
        if (!canceled) setAthletes([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [athleteId])

  const athlete = useMemo(() => {
    if (!athleteId) return undefined
    return athletes.find((a) => a.id === athleteId || a.__key === athleteId)
  }, [athletes, athleteId])

  const avatarSrc = localAvatarUrl || athlete?.avatarUrl || null

  useEffect(() => {
    if (!athlete) {
      setLicences([])
      return
    }

    let canceled = false
    ;(async () => {
      setLicencesLoading(true)
      try {
        const query = new URLSearchParams({
          athleteId: athlete.id,
        })
        const res = await fetch(`/api/athlete-licences?${query.toString()}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setLicences(Array.isArray(json?.licences) ? json.licences : [])
        }
      } catch {
        if (!canceled) setLicences([])
      } finally {
        if (!canceled) setLicencesLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [athlete])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6 text-muted-foreground">Chargement de la fiche athlète.</div>
      </div>
    )
  }

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

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Athlète: ${athlete.prenom} ${athlete.nom}`} />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button><ActorEditor kind="athletes" actor={athlete as unknown as Record<string,string>} onSaved={(saved)=>setAthletes([saved as unknown as Athlete])}/></div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={`${athlete.prenom} ${athlete.nom}`} />
                  <AvatarFallback className="text-lg">{initials(athlete.prenom, athlete.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {athlete.prenom} {athlete.nom}
                  </h2>
                  <p className="text-muted-foreground">{athlete.idNational || athlete.idFiba || athlete.id}</p>
                  <div className="mt-2">
                    <StatusBadge status={athlete.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ID Athlète</p>
                <p className="font-mono font-medium">{athlete.id}</p>
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
          fallbackText={initials(athlete.prenom, athlete.nom)}
          verificationFields={[
            { label: "Nom", value: `${athlete.prenom} ${athlete.nom}` },
            { label: "Sexe", value: athlete.sexe === "M" ? "Masculin" : "Féminin" },
          ]}
          dateNaissanceForAge={athlete.dateNaissance}
          onConfirm={(url) => setLocalAvatarUrl(url)}
          onConfirmFile={async (file) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("entityType", "athlete")
            formData.append("entityId", String(athlete.id))

            const res = await fetch("/api/upload/avatar", {
              method: "POST",
              body: formData,
            })

            const json = await res.json()
            if (!res.ok) throw new Error(String(json?.error ?? "Upload avatar échoué"))

            const url = String(json?.avatarUrl ?? "")
            if (!url) throw new Error("Upload avatar échoué")

            setLocalAvatarUrl(url)
            await reloadAthletes()
            return url
          }}
        />

        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="general" className="w-full">
              Général
            </TabsTrigger>
            <TabsTrigger value="affiliation" className="w-full">
              Affiliations
            </TabsTrigger>
            <TabsTrigger value="licence" className="w-full">
              Licence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6 md:grid-cols-2">
              <DetailCard
                title="Identité"
                icon={User}
                fields={[
                  { label: "ID Athlète", value: athlete.id },
                  { label: "ID national", value: athlete.idNational },
                  { label: "ID FIBA", value: athlete.idFiba },
                  { label: "Nom complet", value: `${athlete.prenom} ${athlete.nom}` },
                  { label: "Sexe", value: athlete.sexe === "M" ? "Masculin" : "Féminin" },
                  { label: "Date de naissance", value: athlete.dateNaissance },
                  { label: "Lieu de naissance", value: athlete.lieuNaissance },
                  { label: "Nationalité", value: athlete.nationalite },
                ]}
              />

              <DetailCard
                title="Contact"
                icon={Contact}
                fields={[
                  { label: "Téléphone", value: athlete.telephone },
                  { label: "Email", value: athlete.email },
                  { label: "Adresse", value: athlete.adresse },
                ]}
              />

              <DetailCard
                title="Identifiants"
                icon={Fingerprint}
                fields={[
                  { label: "ID Athlète", value: athlete.id },
                  { label: "ID national", value: athlete.idNational },
                  { label: "ID FIBA", value: athlete.idFiba },
                  { label: "Statut", value: athlete.statut },
                ]}
              />

              <DetailCard
                title="Observations"
                icon={Info}
                fields={[{ label: "Remarques", value: "Aucune remarque enregistrée" }]}
              />
            </div>
          </TabsContent>

          <TabsContent value="affiliation">
            <AffiliationsPanel kind="athlete" actorId={athlete.id} />
            {false && <Card>
              <CardHeader>
                <CardTitle>Historique des affiliations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Saison</TableHead>
                        <TableHead>Club origine</TableHead>
                        <TableHead>Équipe bénéficiaire</TableHead>
                        <TableHead>Club bénéficiaire</TableHead>
                        <TableHead>Date début</TableHead>
                        <TableHead>Date fin</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfertsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Chargement des affiliations...
                          </TableCell>
                        </TableRow>
                      ) : transferts.length > 0 ? (
                        transferts.map((transfert) => (
                          <TableRow key={transfert.__key ?? transfert.id}>
                            <TableCell>{display(transfert.saison)}</TableCell>
                            <TableCell>{display(transfert.clubOrigine)}</TableCell>
                            <TableCell>{display(transfert.equipeBeneficiaire)}</TableCell>
                            <TableCell className="font-medium">{display(transfert.clubBeneficiaire)}</TableCell>
                            <TableCell>{displaySync(transfert.dateDebut)}</TableCell>
                            <TableCell>{displaySync(transfert.dateFin)}</TableCell>
                            <TableCell><StatusBadge status={transfert.statut} /></TableCell>
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
            </Card>}
          </TabsContent>

          <TabsContent value="licence">
            <Card>
              <CardHeader>
                <CardTitle>Historique des licences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Saison</TableHead>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Structure</TableHead>
                        <TableHead>Délivrée le</TableHead>
                        <TableHead>Expire le</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {licencesLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Chargement des licences...
                          </TableCell>
                        </TableRow>
                      ) : licences.length > 0 ? (
                        licences.map((licence) => (
                          <TableRow key={licence.__key ?? licence.id}>
                            <TableCell>{display(licence.saison)}</TableCell>
                            <TableCell className="font-mono font-medium">{display(licence.numero)}</TableCell>
                            <TableCell>{display(licence.structure)}</TableCell>
                            <TableCell>{display(licence.dateDelivrance)}</TableCell>
                            <TableCell>{display(licence.dateFinValidite)}</TableCell>
                            <TableCell><StatusBadge status={licence.statut} /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Aucune licence enregistrée.
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
