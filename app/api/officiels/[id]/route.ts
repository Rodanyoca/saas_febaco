import { handleActorWrite } from "@/app/api/_actor-write"
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return handleActorWrite(request,"officiels","update",decodeURIComponent((await params).id))}
