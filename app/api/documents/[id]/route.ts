import { protectedRoute } from "@/lib/auth/guard"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { loadDocuments, saveDocument } from "@/lib/documents"
async function GETHandler(_:Request,{params}:{params:Promise<{id:string}>}){if(!await getSessionUser())return NextResponse.json({error:"Authentification requise."},{status:401});const id=decodeURIComponent((await params).id),bundle=await loadDocuments();return NextResponse.json({document:bundle.documents.find(x=>x.id===id)||null,references:bundle.references})}
async function PUTHandler(request:Request,{params}:{params:Promise<{id:string}>}){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Authentification requise."},{status:401});if(user.role!=="federal")return NextResponse.json({error:"Action réservée au niveau fédéral."},{status:403});const result=await saveDocument(await request.json(),decodeURIComponent((await params).id));return !("id" in result)?NextResponse.json({error:"Veuillez corriger les champs indiqués.",fields:result.errors},{status:422}):NextResponse.json({id:result.id})}

export const GET = protectedRoute(GETHandler)
export const PUT = protectedRoute(PUTHandler)
