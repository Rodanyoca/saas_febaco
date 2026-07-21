"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getFilterOptions, type CompetitionEquipeNationale } from "@/lib/models"

const columns: Column<CompetitionEquipeNationale>[] = [
  {key:"id",header:"ID participation",className:"font-mono text-sm"},{key:"competitionNom",header:"Compétition",className:"font-medium"},{key:"equipeNationaleNom",header:"Équipe nationale"},
  {key:"discipline",header:"Discipline"},{key:"categorie",header:"Catégorie"},{key:"sexe",header:"Sexe"},{key:"saison",header:"Saison"},{key:"typeCompetition",header:"Type"},
  {key:"dateDebut",header:"Début"},{key:"dateFin",header:"Fin"},{key:"statutParticipation",header:"Statut",render:(item)=><StatusBadge status={item.statutParticipation}/>}]

export default function CompetitionsPage(){
  const [data,setData]=useState<CompetitionEquipeNationale[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("")
  useEffect(()=>{let active=true;(async()=>{try{const r=await fetch("/api/equipe-nationale-competitions",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j?.error||"Lecture impossible");if(active)setData(j.competitions||[])}catch(e){if(active)setError(e instanceof Error?e.message:"Lecture impossible")}finally{if(active)setLoading(false)}})();return()=>{active=false}},[])
  const filters:Filter[]=useMemo(()=>["equipeNationaleNom","discipline","categorie","sexe","saison","typeCompetition","statutParticipation"].map(key=>({key,label:({equipeNationaleNom:"Équipe nationale",discipline:"Discipline",categorie:"Catégorie",sexe:"Sexe",saison:"Saison",typeCompetition:"Type",statutParticipation:"Statut"}as Record<string,string>)[key],options:getFilterOptions(data,key as keyof CompetitionEquipeNationale)})),[data])
  return <div className="flex flex-col"><Header title="Compétitions des équipes nationales" subtitle={`${data.length} participation${data.length>1?"s":""}`}/><div className="p-6">{loading?<p className="text-muted-foreground">Chargement...</p>:error?<p className="text-destructive">{error}</p>:<DataTable data={data} columns={columns} filters={filters} searchPlaceholder="Compétition, équipe ou identifiant..." detailHref={item=>`/dashboard/equipe-nationale/competitions/${encodeURIComponent(item.id)}`} idKey="__key"/>}</div></div>
}
