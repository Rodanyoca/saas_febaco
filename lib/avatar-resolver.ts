import { buildDrivePublicUrl } from "@/lib/google-drive-url"
import { pickFirst, type SheetRow } from "@/lib/google-sheets"

export type ActorAvatarInfo = {
  avatarUrl: string
  displayName: string
}

function clean(value: unknown): string {
  const next = String(value ?? "").trim()
  return next === "-" ? "" : next
}

export function resolveAvatarUrl(row: SheetRow): string {
  const avatarDriveId = pickFirst(row, ["avatar_drive_id", "drive_id", "avatar_id"])
  const avatarUrl = pickFirst(row, ["avatar_drive_url", "avatar_url", "photo_url", "photo", "avatar"])
  return avatarDriveId ? buildDrivePublicUrl(String(avatarDriveId)) : clean(avatarUrl)
}

export function buildAthleteAvatarMap(rows: SheetRow[]): Map<string, ActorAvatarInfo> {
  const map = new Map<string, ActorAvatarInfo>()

  for (const row of rows) {
    const id = clean(pickFirst(row, ["id_athlete", "athlete_id", "id_joueur", "id", "code_athlete", "code"]))
    if (!id) continue

    const displayName = clean(pickFirst(row, ["nom_complet", "nom complet", "nom_athlete", "nom_joueur", "athlete", "nom"]))
    map.set(id.toLowerCase(), {
      avatarUrl: resolveAvatarUrl(row),
      displayName,
    })
  }

  return map
}

export function resolveActorAvatar(
  sourceRow: SheetRow,
  actorId: string,
  avatarMap: Map<string, ActorAvatarInfo>
): ActorAvatarInfo {
  const directAvatarUrl = resolveAvatarUrl(sourceRow)
  const fromSourceName = clean(pickFirst(sourceRow, ["nom_athlete", "nom_joueur", "athlete", "nom_complet"]))
  const fromAthletes = avatarMap.get(clean(actorId).toLowerCase())

  return {
    avatarUrl: directAvatarUrl || fromAthletes?.avatarUrl || "",
    displayName: fromSourceName || fromAthletes?.displayName || "",
  }
}
