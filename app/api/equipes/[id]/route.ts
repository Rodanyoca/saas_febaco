import { protectedRoute } from "@/lib/auth/guard"
import { handleTerritorialWrite } from "@/app/api/_territorial-write"
async function PUTHandler(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleTerritorialWrite(request, "equipes", "update", decodeURIComponent((await params).id)) }

export const PUT = protectedRoute(PUTHandler)
