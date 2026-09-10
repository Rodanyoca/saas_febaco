"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Contact, Info, User } from "lucide-react"
import { AffiliationsPanel } from "@/components/dashboard/affiliations-panel"
import { ActorEditor, type ActorRecord } from "@/components/dashboard/actor-editor"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AutreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = useMemo(() => Array.isArray(params.id) ? params.id[0] : String(params.id ?? ""), [params])
  const [actor, setActor] = useState<ActorRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch(`/api/autres?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => setActor(json.autres?.[0] ?? null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <><Header title="Chargement…" /><p className="p-6">Chargement de la fiche.</p></>
  if (!actor) return <><Header title="Acteur non trouvé" /><div className="p-6"><Button onClick={() => router.back()}><ArrowLeft />Retour</Button></div></>

  return <div className="flex flex-col">
    <Header title={actor.nom_complet} />
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft />Retour à la liste</Button>
        <ActorEditor kind="autres" actor={actor} onSaved={setActor} />
      </div>
      <Tabs defaultValue="general" className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="affiliations">Affiliations</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <DetailCard title="Identité" icon={User} fields={[{ label: "Identifiant", value: actor.id }, { label: "Nom complet", value: actor.nom_complet }, { label: "Sexe", value: actor.sexe }, { label: "Date de naissance", value: actor.date_de_naissance }, { label: "Nationalité", value: actor.nationalite }, { label: "Type", value: actor.id_type_autre_acteur }, { label: "Statut", value: actor.statut }]} />
            <DetailCard title="Coordonnées" icon={Contact} fields={[{ label: "Téléphone", value: actor.telephone }, { label: "Courriel", value: actor.email }, { label: "Adresse", value: actor.adresse }]} />
            <DetailCard title="Observations" icon={Info} fields={[{ label: "Remarques", value: actor.observations }]} />
          </div>
        </TabsContent>
        <TabsContent value="affiliations"><AffiliationsPanel kind="autre" actorId={actor.id} /></TabsContent>
      </Tabs>
    </div>
  </div>
}
