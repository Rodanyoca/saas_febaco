"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DetailCard } from "@/components/dashboard/detail-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { AffiliationsPanel } from "@/components/dashboard/affiliations-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Officiel, OfficielMandat } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarUploadModal } from "@/components/dashboard/avatar-upload-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Camera, Contact, Fingerprint, Flag } from "lucide-react"
import { formatDisplayDate } from "@/lib/date-format"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "OF"
}

function display(value: unknown): string {
  const raw = String(value ?? "").trim()
  return raw && raw !== "-" ? raw : "-"
}

export default function OfficielDetailPage() {
  const params = useParams()
  const router = useRouter()
  const idParam = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])

  const [officiels, setOfficiels] = useState<Officiel[]>([])
  const [mandats, setMandats] = useState<OfficielMandat[]>([])
  const [mandatsLoading, setMandatsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        if (!idParam) return
        const res = await fetch(`/api/officiels?id=${encodeURIComponent(idParam)}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setOfficiels(Array.isArray(json?.officiels) ? json.officiels : [])
        }
      } catch {
        if (!canceled) setOfficiels([])
      } finally {
        if (!canceled) setLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [idParam])

  async function reloadOfficiels() {
    const res = await fetch(`/api/officiels?id=${encodeURIComponent(idParam ?? "")}`, { cache: "no-store" })
    const json = await res.json()
    setOfficiels(Array.isArray(json?.officiels) ? json.officiels : [])
  }

  const officiel = useMemo(() => {
    if (!idParam) return undefined
    return officiels.find(
      (o) => String(o.id) === String(idParam) || String((o as unknown as { __key?: unknown }).__key) === String(idParam)
    )
  }, [officiels, idParam])

  const avatarSrc = localAvatarUrl || officiel?.avatarUrl || null

  useEffect(() => {
    if (!officiel) {
      setMandats([])
      return
    }

    let canceled = false
    ;(async () => {
      setMandatsLoading(true)
      try {
        const query = new URLSearchParams({ actorId: officiel.id })
        const res = await fetch(`/api/affiliations/officiel?${query.toString()}`, { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setMandats(Array.isArray(json?.mandats) ? json.mandats : [])
        }
      } catch {
        if (!canceled) setMandats([])
      } finally {
        if (!canceled) setMandatsLoading(false)
      }
    })()

    return () => {
      canceled = true
    }
  }, [officiel])

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Chargement..." />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Chargement de la fiche officiel.</p>
        </div>
      </div>
    )
  }

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

  const nomComplet = officiel.nomComplet || `${officiel.prenom} ${officiel.nom}`.trim()

  return (
    <div className="flex flex-col">
      <Header title={`Fiche Officiel: ${nomComplet}`} />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
        <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
        </Button><ActorEditor kind="officiels" actor={officiel as unknown as Record<string,string>} onSaved={(saved)=>setOfficiels([saved as unknown as Officiel])}/></div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  <AvatarImage src={avatarSrc || undefined} alt={nomComplet} />
                  <AvatarFallback className="text-lg">{initials(officiel.prenom, officiel.nom)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {nomComplet}
                  </h2>
                  <p className="text-muted-foreground">{officiel.idNational || officiel.id}</p>
                  <div className="mt-2">
                    <StatusBadge status={officiel.statut} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Code Officiel</p>
                <p className="font-mono font-medium">{officiel.id}</p>
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
          fallbackText={initials(officiel.prenom, officiel.nom)}
          verificationFields={[
            { label: "Nom", value: nomComplet },
            { label: "Sexe", value: officiel.sexe === "M" ? "Masculin" : "Féminin" },
          ]}
          dateNaissanceForAge={officiel.dateNaissance}
          onConfirm={(url) => setLocalAvatarUrl(url)}
          onConfirmFile={async (file) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("entityType", "officiel")
            formData.append("entityId", String(officiel.id))

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
            await reloadOfficiels()
            return url
          }}
        />

        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="general" className="w-full">Général</TabsTrigger>
            <TabsTrigger value="affiliation" className="w-full">Affiliations</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <DetailCard
            title="Identité"
            icon={Flag}
            fields={[
              { label: "ID officiel", value: officiel.id },
              { label: "Nom complet", value: nomComplet },
              { label: "Sexe", value: officiel.sexe === "M" ? "Masculin" : "Féminin" },
              { label: "Date de naissance", value: officiel.dateNaissance },
              { label: "Nationalité", value: officiel.nationalite },
            ]}
          />

          <DetailCard
            title="Identifiants"
            icon={Fingerprint}
            fields={[
              { label: "ID national", value: officiel.idNational },
              { label: "ID FIBA", value: officiel.idFiba },
              { label: "Statut", value: officiel.statut },
            ]}
          />

          <DetailCard
            title="Contact"
            icon={Contact}
            fields={[
              { label: "Téléphone", value: officiel.telephone },
              { label: "Email", value: officiel.email },
            ]}
          />
            </div>
          </TabsContent>

          <TabsContent value="affiliation">
            <AffiliationsPanel kind="officiel" actorId={officiel.id} />
            {false && <Card>
              <CardHeader>
                <CardTitle>Historique des mandats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fonction</TableHead>
                        <TableHead>Structure</TableHead>
                        <TableHead>Date de début</TableHead>
                        <TableHead>Date de fin</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mandatsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Chargement des mandats...
                          </TableCell>
                        </TableRow>
                      ) : mandats.length > 0 ? (
                        mandats.map((mandat) => (
                          <TableRow key={mandat.__key ?? mandat.id}>
                            <TableCell className="font-medium">{display(mandat.fonction)}</TableCell>
                            <TableCell>{display(mandat.structureNom)}</TableCell>
                            <TableCell>{formatDisplayDate(mandat.dateDebut)}</TableCell>
                            <TableCell>{formatDisplayDate(mandat.dateFin)}</TableCell>
                            <TableCell><StatusBadge status={mandat.statut} /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Aucun mandat enregistré.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
