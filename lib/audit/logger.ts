import { randomUUID } from "node:crypto"
import { UsersRepository } from "../users/repository"
import type { AuditResult, UsersSheetsAdapter } from "../users/types"

const FORBIDDEN = /password|mot[_ -]?de[_ -]?passe|secret|cookie|authorization|password_hash|temporaryaccess|token/i

export function sanitizeAuditDetails(details: Record<string, unknown> = {}) {
  const allowed=new Set(["motif","method","status","source","count"])
  return Object.fromEntries(Object.entries(details).filter(([key,value])=>allowed.has(key)&&["string","number","boolean"].includes(typeof value)&&!FORBIDDEN.test(String(value))).map(([key,value])=>[key,typeof value==="string"?value.slice(0,100):value]))
}

export async function writeAudit(input: { adapter: UsersSheetsAdapter; actorId?: string | null; action: string; typeObjet: string; objectId?: string | null; result: AuditResult; requestId: string; details?: Record<string, unknown>; now?: Date }) {
  return new UsersRepository(input.adapter).appendAuditLog({ idOperation: `AUD-${randomUUID()}`, idUser: input.actorId ?? null, action: input.action, typeObjet: input.typeObjet, idObjet: input.objectId ?? null, dateOperation: (input.now ?? new Date()).toISOString(), resultat: input.result, requestId: input.requestId, detailsNonSensibles: JSON.stringify(sanitizeAuditDetails(input.details)) })
}
