"use client"
import { useEffect,useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable,type Column } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor,type ActorRecord } from "@/components/dashboard/actor-editor"

const columns:Column<ActorRecord>[]=[{key:"id",header:"ID",className:"font-mono"},{key:"nom_complet",header:"Nom complet",className:"font-medium"},{key:"sexe",header:"Sexe"},{key:"telephone",header:"Téléphone"},{key:"statut",header:"Statut",render:item=><StatusBadge status={item.statut}/>}]
export default function AutresPage(){
  const [autres,setAutres]=useState<ActorRecord[]>([])
  useEffect(()=>{let active=true;void fetch("/api/autres",{cache:"no-store"}).then(r=>r.json()).then(j=>{if(active)setAutres(Array.isArray(j.autres)?j.autres:[])}).catch(()=>{if(active)setAutres([])});return()=>{active=false}},[])
  return <div className="flex flex-col"><Header title="Autres acteurs" subtitle="Identités des autres acteurs FEBACO"/><div className="flex-1 p-6"><div className="mb-4 flex justify-end"><ActorEditor kind="autres" onSaved={actor=>setAutres(current=>[actor,...current].sort((a,b)=>a.nom_complet.localeCompare(b.nom_complet,"fr",{sensitivity:"base"})))}/></div><DataTable data={autres} columns={columns} idKey="id" searchPlaceholder="Rechercher un autre acteur…" detailHref={item=>`/dashboard/autres/${encodeURIComponent(item.id)}`}/></div></div>
}
