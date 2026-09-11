import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { CompetitionParticipationError, createCompetitionParticipations, getCompetitionParticipants } from "@/lib/competition-participants";

export const dynamic = "force-dynamic";

const responseError = (error: unknown) => error instanceof CompetitionParticipationError
  ? NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status })
  : NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } }, { status: 503 });

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try { return NextResponse.json(await getCompetitionParticipants(decodeURIComponent((await context.params).id))); }
  catch (error) { return responseError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "NON_AUTHENTIFIE", message: "Authentification requise." } }, { status: 401 });
  if (user.role !== "federal") return NextResponse.json({ error: { code: "ECRITURE_REFUSEE", message: "Droit fédéral requis." } }, { status: 403 });
  try {
    const competitionId = decodeURIComponent((await context.params).id);
    const created = await createCompetitionParticipations(competitionId, await request.json().catch(() => null));
    return NextResponse.json({ created, ...(await getCompetitionParticipants(competitionId)) }, { status: 201 });
  } catch (error) { return responseError(error); }
}
