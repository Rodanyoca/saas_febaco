"use client";
import { useCallback,useEffect,useMemo,useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { DataTable,type Column,type Filter } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { CompetitionCatalogDialog } from "@/components/dashboard/competition-catalog-dialog";
import { Button } from "@/components/ui/button";
type Ref={id:string;label:string}; type Permanent={id:string;nom:string;typeId:string;disciplineId:string;discipline?:string;statut:string}; type Edition={id:string;permanentId:string;numeroEdition:string;nom:string;saison:string;dateDebut:string;dateFin:string;pays:string;lieu:string;statut:string}; type Row=Edition&{__key:string;competition:string;edition:string;paysLieu:string}; type Catalog={permanents:Permanent[];editions:Edition[];references:{types:Ref[];disciplines:Ref[];seasons:Ref[]}};
const blank:Catalog={permanents:[],editions:[],references:{types:[],disciplines:[],seasons:[]}};
const route=(id:string)=>encodeURIComponent(id).replace(/%/g,"~");
export default function CompetitionsPage(){
 const [catalog,setCatalog]=useState<Catalog>(blank),[canCreate,setCanCreate]=useState(false),[dialog,setDialog]=useState<"permanent"|"edition"|null>(null),[error,setError]=useState("");
 const load=useCallback(async()=>{try{const r=await fetch("/api/competitions/editions",{cache:"no-store"}),d=await r.json();if(!r.ok)throw new Error(d?.error?.message||d?.error||"Lecture impossible.");setCatalog(d);setError("")}catch(e){setError(e instanceof Error?e.message:"Lecture impossible.")}},[]);
 useEffect(()=>{void load();void fetch("/api/auth/me").then(r=>r.json()).then(d=>setCanCreate(d?.user?.role==="federal"))},[load]);
 const names=useMemo(()=>new Map(catalog.permanents.map(x=>[x.id,x.nom])),[catalog.permanents]);
 const rows=useMemo<Row[]>(()=>catalog.editions.map(x=>({...x,__key:x.id,competition:names.get(x.permanentId)||x.nom,edition:x.numeroEdition||x.nom,paysLieu:[x.pays,x.lieu].filter(Boolean).join(" · ")})).sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)),[catalog.editions,names]);
 const columns:Column<Row>[]=[{key:"saison",header:"Saison"},{key:"competition",header:"Compétition",className:"font-medium"},{key:"edition",header:"Édition"},{key:"dateDebut",header:"Début"},{key:"dateFin",header:"Fin"},{key:"paysLieu",header:"Pays / lieu"},{key:"statut",header:"Statut",render:x=><StatusBadge status={x.statut}/>}];
 const filters:Filter[]=[{key:"saison",label:"Saison",options:[...new Set(rows.map(x=>x.saison))].map(x=>({label:x,value:x}))},{key:"statut",label:"Statut",options:[...new Set(rows.map(x=>x.statut))].map(x=>({label:x,value:x}))}];
 return <div className="flex flex-col"><Header title="Compétitions" subtitle="Éditions opérationnelles"/><main className="space-y-5 p-4 sm:p-6">{error?<p className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>:null}{canCreate?<div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={()=>setDialog("permanent")}><Plus/>Nouvelle compétition</Button><Button onClick={()=>setDialog("edition")}><Plus/>Créer une édition</Button></div>:null}
 <section className="space-y-3"><h2 className="text-lg font-semibold">Éditions</h2><DataTable data={rows} columns={columns} filters={filters} idKey="__key" searchPlaceholder="Rechercher une compétition ou une édition…" detailHref={x=>`/dashboard/competitions/${route(x.id)}`}/></section>
 <CompetitionCatalogDialog kind="permanent" open={dialog==="permanent"} onOpenChange={x=>!x&&setDialog(null)} onCreated={()=>void load()} catalog={catalog}/><CompetitionCatalogDialog kind="edition" open={dialog==="edition"} onOpenChange={x=>!x&&setDialog(null)} onCreated={()=>void load()} catalog={catalog}/></main></div>;
}
