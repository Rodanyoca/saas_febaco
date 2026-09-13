import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { CompetitionParticipationError } from "@/lib/competition-participants";
import { addCompetitionPerson, getCompetitionPeople } from "@/lib/competition-people";

export const dynamic = "force-dynamic";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try { return NextResponse.json(await getCompetitionPeople(decodeURIComponent((await context.params).id))); }
  catch (error) { if (!(error instanceof CompetitionParticipationError)) console.error("[competitions:people] Lecture impossible", error); return error instanceof CompetitionParticipationError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "Lecture des participants impossible." }, { status: 503 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { message: "Authentification requise." } }, { status: 401 });
  if (user.role !== "federal") return NextResponse.json({ error: { message: "Droit fédéral requis." } }, { status: 403 });
  try { const competitionId = decodeURIComponent((await context.params).id); const created = await addCompetitionPerson(competitionId, await request.json().catch(() => null)); return NextResponse.json({ created, ...(await getCompetitionPeople(competitionId)) }, { status: 201 }); }
  catch (error) { return error instanceof CompetitionParticipationError ? NextResponse.json({ error: { message: error.message, fields: error.fields } }, { status: error.status }) : NextResponse.json({ error: { message: "Enregistrement impossible." } }, { status: 503 }); }
}
