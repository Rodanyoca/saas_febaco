import { readSheetRows, writeSheetRowByHeaders, type SheetRow } from "@/lib/google-sheets"

export type TerritorialKind = "ligues" | "ententes" | "clubs" | "equipes"
export type FieldErrors = Record<string, string>

export class TerritorialError extends Error {
  constructor(public code: string, message: string, public status = 400, public fields?: FieldErrors) { super(message) }
}

export const territorialConfig = {
  ligues: { sheet: "LIGUES", id: "id_ligue", required: ["nom_ligue", "id_province", "statut"], refs: { id_province: "PROVINCES" } },
  ententes: { sheet: "ENTENTES", id: "id_entente", required: ["nom_entente", "id_ligue", "statut"], refs: {} },
  clubs: { sheet: "CLUBS", id: "id_club", required: ["nom_club", "id_entente", "id_categorie_club", "statut"], refs: { id_categorie_club: "CATEGORIES_CLUB", id_niveau_competitif_club: "NIVEAUX_COMPETITIFS_CLUB", id_sexe: "SEXES", id_ville: "VILLES" } },
  equipes: { sheet: "EQUIPES", id: "id_equipe", required: ["nom_equipe", "id_club", "id_discipline", "id_categorie_age", "id_sexe", "statut"], refs: { id_discipline: "DISCIPLINES", id_categorie_age: "CATEGORIES_AGE", id_sexe: "SEXES" } },
} as const

const allowedFields: Record<TerritorialKind, string[]> = {
  ligues: ["nom_ligue","sigle_ligue","telephone","email","id_province","statut","observations","id_ligue_coc","date_creation","date_reconnaissance"],
  ententes: ["code_entente","nom_entente","sigle_entente","id_ligue","id_ville","email","statut","observations","id_entente_coc","date_creation","date_reconnaissance","telephone"],
  clubs: ["nom_club","id_categorie_club","id_sexe","date_affiliation","id_ville","id_entente","telephone","statut","observations","id_club_coc","sigle_club","id_niveau_competitif_club","date_creation","email"],
  equipes: ["nom_equipe","id_categorie_age","id_club","id_sexe","statut","observations","id_equipe_coc","id_discipline"],
}

const clean = (value: unknown) => String(value ?? "").trim()

export async function getReferenceMap(sheet: string): Promise<Map<string,string>> {
  const rows=await readSheetRows({block:"referentiel",sheet,range:"A:F"})
  const map=new Map<string,string>()
  for(const row of rows){const idKey=Object.keys(row).find(k=>k.startsWith("id_")),labelKey=Object.keys(row).find(k=>k.startsWith("nom_"));if(!idKey)continue;const id=clean(row[idKey]),label=clean(row[labelKey??""])||id;if(id){map.set(id,label);map.set(label.toUpperCase(),label)}if(sheet==="PROVINCES"&&/^PROV\d{3}$/.test(id))map.set(`PRO${Number(id.slice(4)).toString().padStart(2,"0")}`,label)}
  if(sheet==="SEXES"){if(map.has("MASCULIN"))map.set("MASCULINE",map.get("MASCULIN")!);if(map.has("FEMININ"))map.set("FEMININE",map.get("FEMININ")!)}
  return map
}

export function validateTerritorialInput(kind: TerritorialKind, body: unknown): { values: Record<string,string>; errors: FieldErrors } {
  const source = body && typeof body === "object" ? body as Record<string,unknown> : {}
  const values = Object.fromEntries(allowedFields[kind].map((field) => [field, clean(source[field])]))
  const errors: FieldErrors = {}
  for (const field of territorialConfig[kind].required) if (!values[field]) errors[field] = "Ce champ est obligatoire."
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Adresse e-mail invalide."
  if (values.statut && !["ACTIF","INACTIF"].includes(values.statut)) errors.statut = "Statut invalide."
  if (values.date_creation && values.date_reconnaissance && values.date_reconnaissance < values.date_creation) errors.date_reconnaissance = "La reconnaissance ne peut pas précéder la création."
  return { values, errors }
}

export function generateTerritorialId(kind: TerritorialKind, rows: SheetRow[], values: Record<string,string>): string {
  const ids = rows.map((row) => clean(row[territorialConfig[kind].id]))
  if (kind === "ligues") return String(Math.max(0, ...ids.map(Number).filter(Number.isFinite)) + 1).padStart(2, "0")
  if (kind === "ententes") {
    const parent = values.id_ligue
    const local = ids.filter((id) => id.startsWith(parent)).map((id) => Number(id.slice(parent.length))).filter(Number.isFinite)
    return `${parent}${String(Math.max(0, ...local) + 1).padStart(2, "0")}`
  }
  if (kind === "clubs") return String(Math.max(0, ...ids.map(Number).filter(Number.isFinite)) + 1)
  const parent = values.id_club
  const local = ids.filter((id) => id.startsWith(parent)).map((id) => Number(id.slice(parent.length))).filter(Number.isFinite)
  return `${parent}${String(Math.max(0, ...local) + 1).padStart(2, "0")}`
}

async function requireExisting(sheet: string, idHeader: string, id: string, field: string) {
  const rows = await readSheetRows({ block: "structure", sheet, range: "A:ZZ" })
  if (!rows.some((row) => clean(row[idHeader]) === id)) throw new TerritorialError("PARENT_INTROUVABLE", "Le parent sélectionné n’existe pas.", 422, { [field]: "Sélection introuvable." })
}

async function requireReference(sheet: string, id: string, field: string) {
  if (!id) return
  let rows: SheetRow[]
  try { rows = await readSheetRows({ block: "referentiel", sheet, range: "A:F" }) }
  catch { throw new TerritorialError("REFERENTIEL_INDISPONIBLE", `Le référentiel ${sheet} est indisponible.`, 503, { [field]: "Liste indisponible." }) }
  const idHeader = Object.keys(rows[0] ?? {}).find((key) => key.startsWith("id_"))
  if (!idHeader || !rows.some((row) => clean(row[idHeader]) === id)) throw new TerritorialError("REFERENCE_INVALIDE", "Une valeur de référentiel est invalide.", 422, { [field]: "Valeur inconnue." })
}

export async function mutateTerritorial(kind: TerritorialKind, mode: "create"|"update", body: unknown, id?: string) {
  const config = territorialConfig[kind]
  const { values, errors } = validateTerritorialInput(kind, body)
  if (Object.keys(errors).length) throw new TerritorialError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, errors)

  if (kind === "ententes") await requireExisting("LIGUES", "id_ligue", values.id_ligue, "id_ligue")
  if (kind === "clubs") await requireExisting("ENTENTES", "id_entente", values.id_entente, "id_entente")
  if (kind === "equipes") await requireExisting("CLUBS", "id_club", values.id_club, "id_club")
  for (const [field, sheet] of Object.entries(config.refs)) await requireReference(sheet, values[field], field)
  if (kind === "ententes" && values.id_ville) await requireReference("VILLES", values.id_ville, "id_ville")

  const rows = await readSheetRows({ block: "structure", sheet: config.sheet, range: "A:ZZ" })
  const entityId = mode === "create" ? generateTerritorialId(kind, rows, values) : clean(id)
  if (!entityId) throw new TerritorialError("INTROUVABLE", "Identifiant manquant.", 404)
  if (mode === "update" && kind === "ententes") {
    const current = rows.find((row) => clean(row.id_entente) === entityId)
    if (current && current.id_ligue !== values.id_ligue) {
      const clubs = await readSheetRows({ block: "structure", sheet: "CLUBS", range: "A:H" })
      if (clubs.some((club) => clean(club.id_entente) === entityId)) throw new TerritorialError("RELATION_INCOHERENTE", "Cette entente possède des clubs et ne peut pas changer de ligue.", 409, { id_ligue: "Changement impossible tant que des clubs sont rattachés." })
    }
  }
  if (kind === "ententes" && !values.code_entente) values.code_entente = entityId.slice(values.id_ligue.length)

  try {
    const row = await writeSheetRowByHeaders({ block: "structure", sheet: config.sheet, idHeader: config.id, id: entityId, values, mode })
    return { id: entityId, ...row }
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "IDENTIFIANT_DUPLIQUE") throw new TerritorialError(code, "Cet identifiant existe déjà.", 409)
    if (code === "INTROUVABLE") throw new TerritorialError(code, "L’élément demandé n’existe pas.", 404)
    if (code === "SCHEMA_INDISPONIBLE") throw new TerritorialError(code, "Le schéma Google Sheets est incompatible.", 503)
    throw new TerritorialError("SERVICE_INDISPONIBLE", "L’écriture est temporairement indisponible.", 503)
  }
}
