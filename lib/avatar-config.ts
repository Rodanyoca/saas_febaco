export type ActorFamily = "athlete" | "coach" | "arbitre" | "officiel" | "medecin"

export type ActorAvatarConfig = {
  family: ActorFamily
  label: string
  sheetName: string
  folderEnvName: string
  entityIdHeaderCandidates: string[]
}

const CONFIG: Record<ActorFamily, ActorAvatarConfig> = {
  athlete: { family: "athlete", label: "ATHLETE", sheetName: "ATHLETES", folderEnvName: "GOOGLE_DRIVE_ATHLETE_FOLDER_ID", entityIdHeaderCandidates: ["id_athlete"] },
  coach: { family: "coach", label: "COACH", sheetName: "COACHS", folderEnvName: "GOOGLE_DRIVE_ENTRAINEUR_FOLDER_ID", entityIdHeaderCandidates: ["id_coach"] },
  arbitre: { family: "arbitre", label: "ARBITRE", sheetName: "ARBITRES", folderEnvName: "GOOGLE_DRIVE_ARBITRE_FOLDER_ID", entityIdHeaderCandidates: ["id_arbitre"] },
  officiel: { family: "officiel", label: "OFFICIEL", sheetName: "OFFICIELS", folderEnvName: "GOOGLE_DRIVE_OFFICIEL_FOLDER_ID", entityIdHeaderCandidates: ["id_officiel"] },
  medecin: { family: "medecin", label: "MEDECIN", sheetName: "MEDECINS", folderEnvName: "GOOGLE_DRIVE_MEDECIN_FOLDER_ID", entityIdHeaderCandidates: ["id_medecin"] },
}

export function getActorAvatarConfig(input: unknown): ActorAvatarConfig | null {
  const value = String(input ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
  if (["athlete", "athletes"].includes(value)) return CONFIG.athlete
  if (["coach", "coachs", "entraineur", "entraineurs"].includes(value)) return CONFIG.coach
  if (["arbitre", "arbitres"].includes(value)) return CONFIG.arbitre
  if (["officiel", "officiels"].includes(value)) return CONFIG.officiel
  if (["medecin", "medecins"].includes(value)) return CONFIG.medecin
  return null
}

export function buildAvatarId(config: ActorAvatarConfig, entityId: unknown): string {
  const id = String(entityId ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_").slice(0, 120)
  if (!id) throw new Error("Identifiant métier invalide")
  return `AVATAR_${config.label}_${id}`
}
