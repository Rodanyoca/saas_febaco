"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Camera, Contact, Fingerprint, UserCog } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Coach, CoachAffiliation } from "@/lib/models"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "EN"
}

function display(value: unknown): string {
  const raw = String(value ?? "").trim()
  return raw && raw !== "-" ? raw : "-"
}

export default function CoachDetailPage() {
  const params = useParams()
  const router = useRouter()

  const coachId = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [coachs, setCoachs] = useState<Coach[]>([])
  const [affiliations, setAffiliations] = useState<CoachAffiliation[]>([])
  const [affiliationsLoading, setAffiliationsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const reloadCoachs = async () => {
    try {
      const res = await fetch(`/api/coachs?id=${encodeURIComponent(coachId ?? "")}`, { cache: "no-store" })
      const json = await res.json()
      setCoachs(Array.isArray(json?.coachs) ? json.coachs : [])
    } catch {
      setCoachs([])
    }
  }

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        if (!coachId) return
        const res = await fetch(`/api/coachs?id=${encodeURIComponent(coachId)}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setCoachs(Array.isArray(json?.coachs) ? json.coachs : [])
        }
      } catch {
        if (!canceled) setCoachs([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [coachId])

  const coach = useMemo(() => {
    if (!coachId) return undefined
    return coachs.find(
      (c) => String(c.id) === String(coachId) || String((c as unknown as { __key?: unknown }).__key) === String(coachId)
    )
  }, [coachs, coachId])

  const avatarSrc = localAvatarUrl || (coach as unknown as { avatarUrl?: string })?.avatarUrl || null

  useEffect(() => {
    if (!coach) {
      setAffiliations([])
      return
    }

    let canceled = false
    ;(async () => {
      setAffiliationsLoading(true)
      try {
        const query = new URLSearchParams({ coachId: coach.id })
        const res = await fetch(`/api/coach-affiliations?${query.toString()}`, { cache: "no-store" })
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
  }, [coach])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Chargement de la fiche entraineur.</p>
        </div>
      </div>
    )
  }

  if (!coach) {
    return (
      <div className="flex flex-col">
        <Header title="Entraineur non trouve" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">L'entraineur demande n'existe pas.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  const nomComplet = coach.nomComplet || `${coach.prenom} ${coach.nom}`.trim()

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Entraineur: ${nomComplet}`} />

      <div className="flex-1 space-y-6 p-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour a la liste
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={nomComplet} />
                  <AvatarFallback className="text-lg">{initials(coach.prenom, coach.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{nomComplet}</h2>
                  <p className="text-muted-foreground">{coach.idNational || coach.idFiba || coach.id}</p>
                  <div className="mt-2">
                    <StatusBadge status={coach.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono font-medium">{coach.id}</p>
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
          description="Verifie les informations avant de confirmer la photo."
          currentImageUrl={avatarSrc}
          fallbackText={initials(coach.prenom, coach.nom)}
          verificationFields={[
            { label: "Nom", value: nomComplet },
            { label: "Sexe", value: coach.sexe === "M" ? "Masculin" : "Feminin" },
          ]}
          dateNaissanceForAge={coach.dateNaissance}
          onConfirm={(url) => setLocalAvatarUrl(url)}
          onConfirmFile={async (file) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("entityType", "entraineur")
            formData.append("entityId", String(coach.id))

            const res = await fetch("/api/upload/avatar", {
              method: "POST",
              body: formData,
            })

            const json = await res.json()
            if (!res.ok) {
              throw new Error(String(json?.error ?? "Upload avatar echoue"))
            }

            const url = String(json?.avatarUrl ?? "")
            if (!url) {
              throw new Error("Upload avatar echoue")
            }

            setLocalAvatarUrl(url)
            await reloadCoachs()
            return url
          }}
        />

        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="general" className="w-full">
              General
            </TabsTrigger>
            <TabsTrigger value="affiliation" className="w-full">
              Affiliation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <DetailCard
                title="Identite"
                icon={UserCog}
                fields={[
                  { label: "ID", value: coach.id },
                  { label: "Nom complet", value: nomComplet },
                  { label: "Sexe", value: coach.sexe === "M" ? "Masculin" : "Feminin" },
                  { label: "Date de naissance", value: coach.dateNaissance },
                  { label: "Lieu de naissance", value: coach.lieuNaissance },
                  { label: "Nationalite", value: coach.nationalite },
                ]}
              />

              <DetailCard
                title="Identifiants"
                icon={Fingerprint}
                fields={[
                  { label: "ID", value: coach.id },
                  { label: "ID national", value: coach.idNational },
                  { label: "ID FIBA", value: coach.idFiba },
                  { label: "Statut", value: coach.statut },
                ]}
              />

              <DetailCard
                title="Contact"
                icon={Contact}
                fields={[
                  { label: "Telephone", value: coach.telephone },
                  { label: "Email", value: coach.email },
                  { label: "Adresse", value: coach.adresse },
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
