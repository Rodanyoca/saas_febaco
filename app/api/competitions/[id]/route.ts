import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { CompetitionError, updateCompetition } from "@/lib/competitions";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "NON_AUTHENTIFIE", message: "Authentification requise." } }, { status: 401 });
  if (user.role !== "federal") return NextResponse.json({ error: { code: "ECRITURE_REFUSEE", message: "Droit fédéral requis." } }, { status: 403 });
  try { return NextResponse.json({ competition: await updateCompetition(decodeURIComponent((await context.params).id), await request.json().catch(() => null)) }); }
  catch (error) { if (error instanceof CompetitionError) return NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status }); return NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } }, { status: 503 }); }
}
