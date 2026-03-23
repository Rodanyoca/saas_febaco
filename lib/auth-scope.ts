import type { SessionUser, UserRole } from "@/lib/auth-session"

export type AccessScope =
  | { role: "federal" }
  | { role: "ligue"; ligueId: string }
  | { role: "entente"; ententeId: string }

export function scopeFromSession(user: SessionUser): AccessScope {
  if (user.role === "ligue") {
    return { role: "ligue", ligueId: String(user.ligueId ?? "").trim() }
  }
  if (user.role === "entente") {
    return { role: "entente", ententeId: String(user.ententeId ?? "").trim() }
  }
  return { role: "federal" }
}

export function normalizeRole(input: unknown): UserRole {
  const v = String(input ?? "").trim().toLowerCase()
  if (v === "ligue") return "ligue"
  if (v === "entente") return "entente"
  return "federal"
}

export function canAccessRow(
  scope: AccessScope,
  row: { ligueId?: unknown; ententeId?: unknown }
): boolean {
  if (scope.role === "federal") return true
  if (scope.role === "ligue") return String(row.ligueId ?? "") === scope.ligueId
  return String(row.ententeId ?? "") === scope.ententeId
}

export function applyScopeFilter<T extends { ligueId?: unknown; ententeId?: unknown }>(
  scope: AccessScope,
  rows: T[]
): T[] {
  return rows.filter((r) => canAccessRow(scope, r))
}
