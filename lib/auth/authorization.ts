import type { AuthorizationBlock, User, UserAuthorization } from "../users/types"

export type AuthorizationAction = "READ" | "WRITE"
export type AuthorizationRequirement =
  | { scope: "BUSINESS"; blocks: readonly AuthorizationBlock[] }
  | { scope: "SUPER_ADMIN" }

export interface AuthorizationDecision {
  allowed: boolean
  reason: "ALLOWED" | "SUPER_ADMIN_REQUIRED" | "EXPLICIT_ASSIGNMENT_REQUIRED" | "READ_ONLY_PROFILE" | "SOURCE_UNAVAILABLE"
}

export async function authorizeWithSource(input: {
  user: Pick<User, "idUser" | "typeUser" | "estSuperAdmin">
  requirement: AuthorizationRequirement
  action: AuthorizationAction
  loadAuthorizations: () => Promise<readonly UserAuthorization[]>
  date?: string
}): Promise<AuthorizationDecision> {
  if (input.user.estSuperAdmin || input.requirement.scope === "SUPER_ADMIN") return authorize({ ...input, authorizations: [] })
  try {
    return authorize({ ...input, authorizations: await input.loadAuthorizations() })
  } catch {
    return { allowed: false, reason: "SOURCE_UNAVAILABLE" }
  }
}

export function kinshasaCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kinshasa", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""
  return `${value("year")}-${value("month")}-${value("day")}`
}

export function isAuthorizationActive(authorization: UserAuthorization, date = kinshasaCalendarDate()): boolean {
  return authorization.statut === "ACTIF" && authorization.dateDebut <= date && (!authorization.dateFin || authorization.dateFin >= date)
}

export function authorize(input: {
  user: Pick<User, "idUser" | "typeUser" | "estSuperAdmin">
  authorizations: readonly UserAuthorization[]
  requirement: AuthorizationRequirement
  action: AuthorizationAction
  date?: string
}): AuthorizationDecision {
  if (input.user.estSuperAdmin) return { allowed: true, reason: "ALLOWED" }
  if (input.requirement.scope === "SUPER_ADMIN") {
    return { allowed: false, reason: "SUPER_ADMIN_REQUIRED" }
  }
  const blocks = input.requirement.blocks
  const assigned = input.authorizations.some((item) =>
    item.idUser === input.user.idUser && blocks.includes(item.idBlocAutorisation) && isAuthorizationActive(item, input.date)
  )
  if (!assigned) return { allowed: false, reason: "EXPLICIT_ASSIGNMENT_REQUIRED" }
  if (input.action === "WRITE" && input.user.typeUser !== "ADMIN") return { allowed: false, reason: "READ_ONLY_PROFILE" }
  return { allowed: true, reason: "ALLOWED" }
}

export function assertLastActiveSuperAdminProtected(input: { target: User; users: readonly User[]; willRemainActiveSuperAdmin: boolean }): void {
  if (input.willRemainActiveSuperAdmin || input.target.statut !== "ACTIF" || !input.target.estSuperAdmin) return
  const otherActive = input.users.some((user) => user.idUser !== input.target.idUser && user.statut === "ACTIF" && user.estSuperAdmin)
  if (!otherActive) throw new Error("Le dernier super-administrateur actif ne peut pas être neutralisé.")
}
