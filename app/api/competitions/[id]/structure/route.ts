import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { createCompetitionStructureItem, getCompetitionStructure } from "@/lib/competition-structure";

export const dynamic = "force-dynamic";
const fail = (error: unknown) => {
  if (error instanceof CompetitionParticipationError) return NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status });
  console.error("[competitions:structure] Lecture ou écriture impossible", error);
  return NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Chargement des phases temporairement indisponible. Réessayez dans quelques secondes." } }, { status: 503 });
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try { return NextResponse.json(await getCompetitionStructure(decodeURIComponent((await context.params).id))); }
  catch (error) { return fail(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { message: "Authentification requise." } }, { status: 401 });
  if (user.role !== "federal") return NextResponse.json({ error: { message: "Droit fédéral requis." } }, { status: 403 });
  try {
    const competitionId = decodeURIComponent((await context.params).id);
    const created = await createCompetitionStructureItem(competitionId, await request.json().catch(() => null));
    return NextResponse.json({ created }, { status: 201 });
  } catch (error) { return fail(error); }
}
