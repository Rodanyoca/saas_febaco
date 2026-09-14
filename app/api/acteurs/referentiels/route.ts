import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { readSheetRows } from "@/lib/google-sheets"

export async function GET(){
  if(!await getSessionUser())return NextResponse.json({error:"Non authentifié."},{status:401})
  try{
    const names=["SEXES","SPECIALITES_MEDECINS","TYPES_AUTRES_ACTEURS","GRADES_ARBITRES"]
    const entries=await Promise.all(names.map(async sheet=>{const rows=await readSheetRows({block:"referentiel",sheet,range:"A:F"});return [sheet,rows.map(row=>{const keys=Object.keys(row),idKey=keys.find(k=>k.startsWith("id_")),labelKey=keys.find(k=>k.startsWith("nom_"));return {id:idKey?row[idKey]:"",label:labelKey?row[labelKey]:""}}).filter(x=>x.id)] as const}))
    return NextResponse.json({referentiels:Object.fromEntries(entries)})
  }catch{return NextResponse.json({error:"Référentiels indisponibles."},{status:503})}
}
