"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Camera, Contact, Fingerprint, Info, UserCog } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { AffiliationsPanel } from "@/components/dashboard/affiliations-panel"
import { CoachLicensesPanel } from "@/components/dashboard/coach-licenses-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Coach } from "@/lib/models"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "EN"
}

export default function CoachDetailPage() {
  const params = useParams()
  const router = useRouter()

  const coachId = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [coachs, setCoachs] = useState<Coach[]>([])
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
        <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour a la liste
        </Button><ActorEditor kind="coachs" actor={coach as unknown as Record<string,string>} onSaved={(saved)=>setCoachs([saved as unknown as Coach])}/></div>

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
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="general" className="w-full">
              Général
            </TabsTrigger>
            <TabsTrigger value="affiliation" className="w-full">
              Affiliations
            </TabsTrigger>
            <TabsTrigger value="licences" className="w-full">
              Licences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6 md:grid-cols-2">
              <DetailCard
                title="Identité"
                icon={UserCog}
                fields={[
                  { label: "Nom complet", value: nomComplet },
                  { label: "Sexe", value: coach.sexe === "M" ? "Masculin" : "Feminin" },
                  { label: "Date de naissance", value: coach.dateNaissance },
                  { label: "Lieu de naissance", value: coach.lieuNaissance },
                  { label: "Nationalité", value: coach.nationalite },
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
                  { label: "Téléphone", value: coach.telephone },
                  { label: "Email", value: coach.email },
                  { label: "Adresse", value: coach.adresse },
                ]}
              />
              <DetailCard
                title="Observations"
                icon={Info}
                fields={[{ label: "Remarques", value: coach.observations || "Aucune remarque enregistrée" }]}
              />
            </div>
          </TabsContent>

          <TabsContent value="affiliation">
            <AffiliationsPanel kind="coach" actorId={coach.id} />

          </TabsContent>
          <TabsContent value="licences">
            <CoachLicensesPanel actorId={coach.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
