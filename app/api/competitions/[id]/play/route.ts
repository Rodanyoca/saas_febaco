import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { createCompetitionMatch, createCompetitionPhaseUnit, createCompetitionQualifications, createCompetitionResult, getCompetitionPlay } from "@/lib/competition-play";

export const dynamic = "force-dynamic";
const fail = (error: unknown) => error instanceof CompetitionParticipationError
  ? NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status })
  : NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } }, { status: 503 });

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try { return NextResponse.json(await getCompetitionPlay(decodeURIComponent((await context.params).id))); }
  catch (error) { return fail(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { message: "Authentification requise." } }, { status: 401 });
  if (user.role !== "federal") return NextResponse.json({ error: { message: "Droit fédéral requis." } }, { status: 403 });
  try {
    const competitionId = decodeURIComponent((await context.params).id), body = await request.json().catch(() => null);
    const action = body && typeof body === "object" ? String((body as Record<string, unknown>).action ?? "") : "";
    const created = action === "match" ? await createCompetitionMatch(competitionId, body) : action === "resultat" ? await createCompetitionResult(competitionId, body) : action === "phase-unit" ? await createCompetitionPhaseUnit(competitionId, body) : action === "qualifications" ? await createCompetitionQualifications(competitionId, body) : null;
    if (!created) return NextResponse.json({ error: { message: "Action invalide." } }, { status: 422 });
    const payload = action === "match" ? { created } : { created, ...(await getCompetitionPlay(competitionId)) };
    return NextResponse.json(payload, { status: 201 });
  } catch (error) { return fail(error); }
}
