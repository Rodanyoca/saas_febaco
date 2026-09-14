import {NextResponse} from "next/server"
import {handleAffiliationWrite} from "@/app/api/_affiliation-write"
import type {AffiliationKind} from "@/lib/affiliations"
const kinds=new Set(["athlete","coach","medecin","officiel"])
export async function PUT(request:Request,{params}:{params:Promise<{kind:string;id:string}>}){const {kind,id}=await params;if(!kinds.has(kind))return NextResponse.json({error:"Type invalide."},{status:404});return handleAffiliationWrite(request,kind as AffiliationKind,"update",decodeURIComponent(id))}
