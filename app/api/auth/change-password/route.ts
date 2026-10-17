import { readAuthJson } from "@/lib/auth/request-body"
import { isMutationOriginAllowed } from "@/lib/auth/request-origin"
import { NextResponse } from "next/server"
import { createSession, getSessionUser } from "@/lib/auth-session"
import { changeOwnPassword } from "@/lib/auth/account-workflows"
import { authenticationWorkflowFailure } from "@/lib/auth/workflow-error"
import { createGoogleUsersSheetsAdapter } from "@/lib/users/google-adapter"
import { getUserById } from "@/lib/users/data"

export async function POST(request: Request) {
  if (!isMutationOriginAllowed(request)) return NextResponse.json({ error: "Origine refusee." }, { status: 403 })
  const session = await getSessionUser()
  if (!session || session.doitChangerMotDePasse) return NextResponse.json({ error: "Accès invalide." }, { status: 401 })
  try {
    const body = await readAuthJson(request) as Record<string, unknown>
    if (!body || typeof body.currentPassword !== "string" || typeof body.newPassword !== "string" || body.currentPassword.length > 1024 || body.newPassword !== body.confirmation) {
      return NextResponse.json({ error: "Vérifiez les informations saisies." }, { status: 400 })
    }
    const user = await getUserById(session.idUser!)
    if (!user) return NextResponse.json({ error: "Accès invalide." }, { status: 401 })
    const updated = await changeOwnPassword({ adapter: createGoogleUsersSheetsAdapter(), user, currentPassword: body.currentPassword, newPassword: body.newPassword })
    await createSession({ idUser: updated.idUser, sessionVersion: updated.sessionVersion })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const failure = authenticationWorkflowFailure(error, "Les informations saisies ne permettent pas de modifier le mot de passe.")
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
}
