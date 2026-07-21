"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { DetailCard } from "@/components/dashboard/detail-card"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { nationalScoreLabel } from "@/lib/equipe-nationale-utils"
import type { CompetitionEquipeNationale, ResultatEquipeNationale } from "@/lib/models"

const columns:Column<ResultatEquipeNationale>[]=[{key:"dateMatch",header:"Date"},{key:"phase",header:"Phase"},{key:"nomAdversaire",header:"Adversaire",className:"font-medium"},{key:"paysAdversaire",header:"Pays"},{key:"scoreTotalA",header:"Score",render:nationalScoreLabel},{key:"uniteVainqueurNom",header:"Vainqueur"},{key:"statutMatch",header:"Statut",render:item=><StatusBadge status={item.statutMatch}/>}]
export default function CompetitionDetailPage(){
 const raw=useParams<{id:string}>().id;const id=decodeURIComponent(Array.isArray(raw)?raw[0]:raw);const[data,setData]=useState<CompetitionEquipeNationale|null>(null);const[resultats,setResultats]=useState<ResultatEquipeNationale[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("")
 useEffect(()=>{let active=true;(async()=>{try{const e=encodeURIComponent(id);const[a,b]=await Promise.all([fetch(`/api/equipe-nationale-competitions?id=${e}`,{cache:"no-store"}),fetch(`/api/equipe-nationale-resultats?participationId=${e}`,{cache:"no-store"})]);const[ja,jb]=await Promise.all([a.json(),b.json()]);if(!a.ok||!b.ok)throw new Error(ja?.error||jb?.error||"Lecture impossible");if(active){setData(ja.competition);setResultats(jb.resultats||[])}}catch(e){if(active)setError(e instanceof Error?e.message:"Lecture impossible")}finally{if(active)setLoading(false)}})();return()=>{active=false}},[id])
 if(loading)return <><Header title="Participation"/><div className="p-6 text-muted-foreground">Chargement...</div></>;if(error||!data)return <><Header title="Participation"/><div className="p-6 text-destructive">{error||"Participation introuvable."}</div></>
 return <div className="flex flex-col"><Header title={data.competitionNom} subtitle={data.equipeNationaleNom}/><div className="p-6"><Tabs defaultValue="informations"><TabsList><TabsTrigger value="informations">Informations</TabsTrigger><TabsTrigger value="resultats">Résultats</TabsTrigger></TabsList><TabsContent value="informations"><DetailCard title="Participation" fields={[{label:"ID participation",value:data.id},{label:"Équipe nationale",value:data.equipeNationaleNom},{label:"Compétition",value:data.competitionNom},{label:"Type",value:data.typeCompetition},{label:"Discipline",value:data.discipline},{label:"Catégorie",value:data.categorie},{label:"Sexe",value:data.sexe},{label:"Saison",value:data.saison},{label:"Date de début",value:data.dateDebut},{label:"Date de fin",value:data.dateFin},{label:"Statut",value:data.statutParticipation}]}/></TabsContent><TabsContent value="resultats"><DataTable data={resultats} columns={columns} searchPlaceholder="Rechercher un match..." detailHref={item=>`/dashboard/equipe-nationale/resultats/${encodeURIComponent(item.id)}`} idKey="__key"/></TabsContent></Tabs></div></div>
}
