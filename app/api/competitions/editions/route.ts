import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { CompetitionError } from "@/lib/competitions";
import { createCompetitionEvent, listCompetitionCatalog } from "@/lib/competition-catalog";

const fail = (error: unknown) => error instanceof CompetitionError ? NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status }) : NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } }, { status: 503 });
export async function GET() { if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); try { return NextResponse.json(await listCompetitionCatalog()); } catch (error) { return fail(error); } }
export async function POST(request: Request) { const user = await getSessionUser(); if (!user) return NextResponse.json({ error: { message: "Authentification requise." } }, { status: 401 }); if (user.role !== "federal") return NextResponse.json({ error: { message: "Droit fédéral requis." } }, { status: 403 }); try { return NextResponse.json({ created: await createCompetitionEvent(await request.json().catch(() => null)) }, { status: 201 }); } catch (error) { return fail(error); } }
