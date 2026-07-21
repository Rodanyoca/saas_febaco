"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { CalendarDays, Medal, Trophy, Users } from "lucide-react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { matchOutcome, nationalScoreLabel } from "@/lib/equipe-nationale-utils"
import { getFilterOptions, type CompetitionEquipeNationale, type EquipeNationale, type ResultatEquipeNationale, type SelectionEquipeNationale } from "@/lib/models"

async function getJson(url: string) { const response = await fetch(url, { cache: "no-store" }); const json = await response.json(); if (!response.ok) throw new Error(json?.error || "Lecture impossible"); return json }
const selectionColumns: Column<SelectionEquipeNationale>[] = [
  { key: "id", header: "ID sélection", className: "font-mono text-sm" }, { key: "athleteNom", header: "Athlète", className: "font-medium" },
  { key: "sexe", header: "Sexe" }, { key: "posteNom", header: "Poste" }, { key: "equipeNom", header: "Équipe" }, { key: "clubNom", header: "Club" },
  { key: "statutSelection", header: "Statut", render: (item) => <StatusBadge status={item.statutSelection} /> },
]
const competitionColumns: Column<CompetitionEquipeNationale>[] = [
  { key: "competitionNom", header: "Compétition", className: "font-medium" }, { key: "typeCompetition", header: "Type" }, { key: "discipline", header: "Discipline" },
  { key: "saison", header: "Saison" }, { key: "dateDebut", header: "Début" }, { key: "dateFin", header: "Fin" },
  { key: "statutParticipation", header: "Statut", render: (item) => <StatusBadge status={item.statutParticipation} /> },
]
const resultColumns: Column<ResultatEquipeNationale>[] = [
  { key: "dateMatch", header: "Date" }, { key: "competitionNom", header: "Compétition" }, { key: "phase", header: "Phase" },
  { key: "nomAdversaire", header: "Adversaire", className: "font-medium" }, { key: "paysAdversaire", header: "Pays" },
  { key: "scoreTotalA", header: "Score", render: nationalScoreLabel }, { key: "uniteVainqueurNom", header: "Vainqueur" },
  { key: "statutMatch", header: "Statut", render: (item) => <StatusBadge status={item.statutMatch} /> },
]

export default function EquipeNationaleDetailPage() {
  const raw = useParams<{ id: string }>().id; const id = decodeURIComponent(Array.isArray(raw) ? raw[0] : raw)
  const [equipe, setEquipe] = useState<EquipeNationale | null>(null); const [selections, setSelections] = useState<SelectionEquipeNationale[]>([])
  const [competitions, setCompetitions] = useState<CompetitionEquipeNationale[]>([]); const [resultats, setResultats] = useState<ResultatEquipeNationale[]>([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState("")
  useEffect(() => { let active = true; (async () => { try { const encoded = encodeURIComponent(id); const [a,b,c,d] = await Promise.all([
    getJson(`/api/equipe-nationale?id=${encoded}`), getJson(`/api/equipe-nationale-selections?equipeId=${encoded}`),
    getJson(`/api/equipe-nationale-competitions?equipeId=${encoded}`), getJson(`/api/equipe-nationale-resultats?equipeId=${encoded}`)])
    if (active) { setEquipe(a.equipeNationale); setSelections(b.selections || []); setCompetitions(c.competitions || []); setResultats(d.resultats || []) }
  } catch(e) { if(active) setError(e instanceof Error ? e.message : "Lecture impossible") } finally { if(active) setLoading(false) } })(); return () => { active = false } }, [id])
  const stats = useMemo(() => ({ wins: resultats.filter((r) => matchOutcome(r) === "Victoire").length, losses: resultats.filter((r) => matchOutcome(r) === "Défaite").length }), [resultats])
  const selectionFilters: Filter[] = useMemo(() => ["posteNom", "sexe", "statutSelection"].map((key) => ({ key, label: ({posteNom:"Poste",sexe:"Sexe",statutSelection:"Statut"} as Record<string,string>)[key], options: getFilterOptions(selections, key as keyof SelectionEquipeNationale) })), [selections])
  if (loading) return <><Header title="Équipe nationale" /><div className="p-6 text-muted-foreground">Chargement...</div></>
  if (error || !equipe) return <><Header title="Équipe nationale" /><div className="p-6 text-destructive">{error || "Équipe introuvable."}</div></>
  return <div className="flex flex-col"><Header title={equipe.nom} subtitle={`${equipe.discipline} · ${equipe.categorie} · ${equipe.sexe} · ${equipe.saison}`} />
    <div className="flex-1 space-y-6 p-6"><Tabs defaultValue="apercu"><TabsList className="grid h-auto w-full grid-cols-4"><TabsTrigger value="apercu">Aperçu</TabsTrigger><TabsTrigger value="selection">Sélection</TabsTrigger><TabsTrigger value="competitions">Compétitions</TabsTrigger><TabsTrigger value="resultats">Résultats</TabsTrigger></TabsList>
      <TabsContent value="apercu" className="space-y-6"><DetailCard title="Informations générales" icon={Trophy} fields={[{label:"ID",value:equipe.id},{label:"Nom",value:equipe.nom},{label:"Discipline",value:equipe.discipline},{label:"Catégorie",value:equipe.categorie},{label:"Sexe",value:equipe.sexe},{label:"Saison",value:equipe.saison},{label:"Statut",value:equipe.statut}]} />
        <div className="grid gap-4 md:grid-cols-5"><Stat label="Athlètes" value={selections.length} icon={Users}/><Stat label="Compétitions" value={competitions.length} icon={Trophy}/><Stat label="Matchs" value={resultats.length} icon={CalendarDays}/><Stat label="Victoires" value={stats.wins} icon={Medal}/><Stat label="Défaites" value={stats.losses} icon={Medal}/></div></TabsContent>
      <TabsContent value="selection"><DataTable data={selections} columns={selectionColumns} filters={selectionFilters} searchPlaceholder="Athlète, ID, équipe ou club..." detailHref={(item) => `/dashboard/athletes/${encodeURIComponent(item.athleteId)}`} idKey="__key" /></TabsContent>
      <TabsContent value="competitions"><DataTable data={competitions} columns={competitionColumns} searchPlaceholder="Rechercher une compétition..." detailHref={(item) => `/dashboard/equipe-nationale/competitions/${encodeURIComponent(item.id)}`} idKey="__key" /></TabsContent>
      <TabsContent value="resultats"><DataTable data={resultats} columns={resultColumns} searchPlaceholder="Rechercher un résultat..." detailHref={(item) => `/dashboard/equipe-nationale/resultats/${encodeURIComponent(item.id)}`} idKey="__key" /></TabsContent>
    </Tabs></div></div>
}
function Stat({label,value,icon:Icon}:{label:string;value:number;icon:React.ComponentType<{className?:string}>}) { return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="h-6 w-6 text-primary"/></CardContent></Card> }
