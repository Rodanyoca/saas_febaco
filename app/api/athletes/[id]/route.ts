import { protectedRoute } from "@/lib/auth/guard"
import { handleActorWrite } from "@/app/api/_actor-write"
async function PUTHandler(request:Request,{params}:{params:Promise<{id:string}>}){return handleActorWrite(request,"athletes","update",decodeURIComponent((await params).id))}

export const PUT = protectedRoute(PUTHandler)
