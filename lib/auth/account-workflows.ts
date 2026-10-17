import { randomUUID } from "node:crypto"
import { hashPassword, verifyPassword } from "./password"
import { UserCommands } from "../users/commands"
import { UsersRepository } from "../users/repository"
import type { AuditLogEntry, User, UsersSheetsAdapter } from "../users/types"

type Context = { adapter: UsersSheetsAdapter; now?: Date; requestId?: string }

async function audit(adapter: UsersSheetsAdapter, actorId: string, targetId: string, action: string, result: "SUCCES" | "ECHEC", requestId: string = randomUUID()) {
  const entry: AuditLogEntry = { idOperation: `AUD-${randomUUID()}`, idUser: actorId, action, typeObjet: "USER", idObjet: targetId, dateOperation: new Date().toISOString(), resultat: result, requestId, detailsNonSensibles: "{}" }
  await new UsersRepository(adapter).appendAuditLog(entry)
}

async function changeSecret(context: Context & { user: User; newPassword: string; action: string }): Promise<User> {
  const now = context.now ?? new Date()
  const fresh = await new UsersRepository(context.adapter).requireUserById(context.user.idUser)
  if(fresh.statut !== "ACTIF" || fresh.sessionVersion !== context.user.sessionVersion || fresh.passwordHash !== context.user.passwordHash) throw new Error("Session modifiee.")
  const updated = await new UserCommands(context.adapter).replaceUser({ ...fresh, passwordHash: await hashPassword(context.newPassword), doitChangerMotDePasse: false, dateExpirationAccesTemporaire: null, dateModificationMotDePasse: now.toISOString(), derniereConnexion: now.toISOString(), sessionVersion: context.user.sessionVersion + 1 })
  try { await audit(context.adapter, updated.idUser, updated.idUser, context.action, "SUCCES", context.requestId) }
  catch (error) { throw error }
  return updated
}

export async function activateAccount(context: Context & { user: User; temporaryAccess: string; newPassword: string }): Promise<User> {
  try { const now = context.now ?? new Date(); if (!context.user.doitChangerMotDePasse || !context.user.dateExpirationAccesTemporaire || Date.parse(context.user.dateExpirationAccesTemporaire) <= now.getTime()) throw new Error("Accès invalide."); if (!(await verifyPassword(context.temporaryAccess, context.user.passwordHash))) throw new Error("Accès invalide."); if (context.temporaryAccess === context.newPassword) throw new Error("Le nouveau mot de passe doit être différent de l’accès temporaire."); return await changeSecret({ ...context, now, action: "ACTIVATION_COMPTE" }) }
  catch (error) { await audit(context.adapter, context.user.idUser, context.user.idUser, "ACTIVATION_COMPTE", "ECHEC", context.requestId).catch(() => undefined); throw error }
}

export async function changeOwnPassword(context: Context & { user: User; currentPassword: string; newPassword: string }): Promise<User> {
  try { if (!(await verifyPassword(context.currentPassword, context.user.passwordHash))) throw new Error("Accès invalide."); if (context.currentPassword === context.newPassword) throw new Error("Le nouveau mot de passe doit être différent."); return await changeSecret({ ...context, action: "CHANGEMENT_MOT_DE_PASSE" }) }
  catch (error) { await audit(context.adapter, context.user.idUser, context.user.idUser, "CHANGEMENT_MOT_DE_PASSE", "ECHEC", context.requestId).catch(() => undefined); throw error }
}
