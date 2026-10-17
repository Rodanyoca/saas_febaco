import { UsersDataError } from "./errors"
import type { UserAuthorization } from "./types"

function endOrInfinity(value: string | null): string {
  return value ?? "9999-12-31"
}

export function assertNoAuthorizationOverlaps(authorizations: UserAuthorization[]): void {
  const groups = new Map<string, UserAuthorization[]>()
  for (const authorization of authorizations) {
    if (authorization.statut !== "ACTIF") continue
    const key = `${authorization.idUser}:${authorization.idBlocAutorisation}`
    const group = groups.get(key) ?? []
    group.push(authorization)
    groups.set(key, group)
  }

  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]
      const current = sorted[index]
      if (current.dateDebut <= endOrInfinity(previous.dateFin)) {
        throw new UsersDataError("CONFLICT", `Périodes d'autorisation chevauchantes pour ${key}.`)
      }
    }
  }
}
