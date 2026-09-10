import { handleTerritorialWrite } from "@/app/api/_territorial-write"
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleTerritorialWrite(request, "ligues", "update", decodeURIComponent((await params).id)) }
