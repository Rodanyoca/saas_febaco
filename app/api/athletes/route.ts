import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listActors } from "@/lib/actors"
import { handleActorWrite } from "@/app/api/_actor-write"
import { readSheetRows } from "@/lib/google-sheets"
import { resolveAthleteAgeCategory } from "@/lib/athlete-age-category"
export const dynamic="force-dynamic"
export async function GET(request:Request){if(!await getSessionUser())return NextResponse.json({error:"Non authentifié."},{status:401});try{const params=new URL(request.url).searchParams,id=params.get("id")?.trim().toLowerCase(),search=params.get("search")?.trim().toLowerCase();const[actorRows,categories]=await Promise.all([listActors("athletes"),readSheetRows({block:"referentiel",sheet:"CATEGORIES_AGE",range:"A:F"})]);let actors: Array<Record<string,string>>=(actorRows as unknown as Array<Record<string,string>>).map(actor=>({...actor,categorie:resolveAthleteAgeCategory(actor.dateNaissance||actor.date_de_naissance,categories).label}));if(id)actors=actors.filter(a=>a.id.toLowerCase()===id);if(search)actors=actors.filter(a=>Object.values(a).join(" ").toLowerCase().includes(search));return NextResponse.json({athletes:actors})}catch(error){return NextResponse.json({athletes:[],error:error instanceof Error?error.message:"Lecture impossible."},{status:500})}}
export async function POST(request:Request){return handleActorWrite(request,"athletes","create")}
