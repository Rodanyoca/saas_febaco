import { NextResponse } from "next/server";
import { protectedRoute } from "@/lib/auth/guard";
import { getSessionUser } from "@/lib/auth-session";
import { changeCompetitionParticipation } from "@/lib/competition-participation-edit";
import { CompetitionParticipationError, getCompetitionParticipants } from "@/lib/competition-participants";

type Context = { params: Promise<{ id: string; participationId: string }> };
async function change(request: Request, context: Context, remove: boolean) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { message: "Authentification requise." } }, { status: 401 });
  if (user.role !== "federal") return NextResponse.json({ error: { message: "Droit fédéral requis." } }, { status: 403 });
  try {
    const params = await context.params, id = decodeURIComponent(params.id), participationId = decodeURIComponent(params.participationId);
    await changeCompetitionParticipation(id, participationId, remove ? null : await request.json(), remove);
    return NextResponse.json(await getCompetitionParticipants(id));
  } catch (error) {
    return error instanceof CompetitionParticipationError ? NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status }) : NextResponse.json({ error: { message: "Service temporairement indisponible." } }, { status: 503 });
  }
}
export const PUT = protectedRoute((request: Request, context: Context) => change(request, context, false));
export const DELETE = protectedRoute((request: Request, context: Context) => change(request, context, true));
