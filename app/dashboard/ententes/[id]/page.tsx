"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, CircleOff, Layers3, Loader2, Network, Pencil, ShieldCheck } from "lucide-react"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Club, Entente } from "@/lib/models"

type EntenteDetail = Entente & { sigle?: string; telephone?: string; id_ville?: string; id_entente_coc?: string; date_creation?: string; date_reconnaissance?: string; observations?: string; observation?: string }
type EntenteClub = Club & { sigle?: string; equipeCount: number }

const clean = (value: unknown) => String(value ?? "").trim()
const same = (left: unknown, right: unknown) => { const a=clean(left).toLocaleLowerCase("fr"),b=clean(right).toLocaleLowerCase("fr"); return Boolean(a&&b&&a===b) }
const display = (value: unknown) => { const text=clean(value); return text&&text!=="-"?text:"-" }

const clubColumns:Column<EntenteClub>[]=[
  {key:"id",header:"ID Club",className:"font-mono text-sm"},
  {key:"nom",header:"Club",className:"font-medium"},
  {key:"sigle",header:"Sigle",render:club=>display(club.sigle)},
  {key:"categorie",header:"Catégorie",render:club=>display(club.categorie)},
  {key:"equipeCount",header:"Équipes"},
  {key:"statut",header:"Statut",render:club=><StatusBadge status={club.statut}/>},
]

export default function EntenteDetailPage(){
  const params=useParams<{id:string|string[]}>(),router=useRouter(),id=Array.isArray(params.id)?params.id[0]:params.id
  const [entente,setEntente]=useState<EntenteDetail|null>(null),[ententeClubs,setEntenteClubs]=useState<EntenteClub[]>([]),[canEdit,setCanEdit]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("")

  useEffect(()=>{let cancelled=false;void fetch(`/api/ententes/${encodeURIComponent(id)}`,{cache:"no-store"}).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload?.error||"Lecture impossible.");if(!cancelled){setEntente(payload.entente);setEntenteClubs(payload.clubs||[]);setCanEdit(Boolean(payload.canEdit))}}).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:"Lecture impossible.")}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[id])
  const equipeCount=ententeClubs.reduce((total,club)=>total+club.equipeCount,0),activeClubCount=ententeClubs.filter(club=>same(club.statut,"ACTIF")).length,inactiveClubCount=ententeClubs.length-activeClubCount

  if(loading)return <div className="flex flex-col"><Header title="Chargement…"/><p className="p-6 text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Chargement de l’entente…</p></div>
  if(error||!entente)return <div className="flex flex-col"><Header title="Entente introuvable"/><div className="p-6"><p className="text-destructive">{error||"L’entente demandée n’existe pas."}</p><Button className="mt-4" onClick={()=>router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>Retour</Button></div></div>

  return <div className="flex flex-col"><Header title={`Fiche Entente : ${entente.nom}`} subtitle={display(entente.ligue)}/><main className="flex-1 space-y-6 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={()=>router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>Retour à la liste</Button>{canEdit?<Button asChild><Link href={`/dashboard/ententes?edit=${encodeURIComponent(entente.id)}`}><Pencil/>Modifier</Link></Button>:null}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <DetailCard title="Informations générales" icon={Network} fields={[{label:"ID Entente",value:entente.id},{label:"Nom de l’entente",value:entente.nom},{label:"Sigle",value:display(entente.sigle||entente.pseudo)},{label:"Ligue",value:display(entente.ligue)},{label:"Ville",value:display(entente.id_ville)},{label:"Statut",value:display(entente.statut)}]}/>
      <DetailCard title="Coordonnées et reconnaissance" icon={ShieldCheck} fields={[{label:"Téléphone",value:display(entente.telephone)},{label:"E-mail",value:display(entente.email)},{label:"Date de création",value:display(entente.date_creation)},{label:"Date de reconnaissance",value:display(entente.date_reconnaissance)},{label:"Identifiant COC",value:display(entente.id_entente_coc)},{label:"Observations",value:display(entente.observations||entente.observation)}]}/>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatTile icon={Building2} label="Clubs" value={ententeClubs.length}/><StatTile icon={Layers3} label="Équipes" value={equipeCount}/><StatTile icon={ShieldCheck} label="Clubs actifs" value={activeClubCount}/><StatTile icon={CircleOff} label="Clubs inactifs" value={inactiveClubCount}/></div>
    <Card><CardHeader><CardTitle>Clubs de l’entente</CardTitle></CardHeader><CardContent><DataTable data={ententeClubs} columns={clubColumns} searchPlaceholder="Rechercher un club…" idKey="id" detailHref={club=>`/dashboard/clubs/${encodeURIComponent(club.id)}`} renderMobileCard={club=><div className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{club.nom}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{club.id}</p></div><StatusBadge status={club.statut}/></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">Catégorie</p><p className="font-medium">{display(club.categorie)}</p></div><div><p className="text-muted-foreground">Équipes</p><p className="font-medium">{club.equipeCount}</p></div></div><Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link href={`/dashboard/clubs/${encodeURIComponent(club.id)}`}>Voir le club</Link></Button></div>}/></CardContent></Card>
  </main></div>
}

function StatTile({icon:Icon,label,value}:{icon:React.ComponentType<{className?:string}>;label:string;value:number}){return <Card><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="h-6 w-6 text-primary"/></CardContent></Card>}
