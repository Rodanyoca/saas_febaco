import { pickFirst, readSheetRows, writeSheetRowByHeaders, type SheetRow } from "@/lib/google-sheets"

export type AffiliationKind = "athlete" | "coach" | "medecin" | "officiel" | "autre"
export type AffiliationFields = Record<string, string>
export type AffiliationFilters = { actorId?: string; equipeId?: string; clubId?: string; typeEntiteId?: string; entiteId?: string }
export class AffiliationError extends Error { constructor(public code: string, message: string, public status = 400, public fields?: AffiliationFields) { super(message) } }

export const affiliationConfig = {
  athlete: { sheet: "ATHLETE_AFFILIATIONS", id: "id_affiliation_athlete", actor: "id_athlete", prefix: "AFA", fields: ["id_equipe", "date_debut", "date_fin", "id_statut_affiliation", "observation"] },
  coach: { sheet: "COACH_AFFILIATIONS", id: "id_affiliation_coach", actor: "id_coach", prefix: "AFC", fields: ["id_equipe", "id_fonction", "date_debut", "date_fin", "id_statut_affiliation", "observation"] },
  medecin: { sheet: "MEDECINS_AFFILIATIONS", id: "id_affiliation_medecin", actor: "id_medecin", prefix: "AFM", fields: ["id_equipe", "date_debut", "date_fin", "id_statut_affiliation", "observation"] },
  officiel: { sheet: "OFFICIELS_AFFILIATIONS", id: "id_affiliation_officiel", actor: "id_officiel", prefix: "AFO", fields: ["id_fonction", "id_type_entite", "id_entite", "date_debut", "date_fin", "id_statut_affiliation", "observation"] },
  autre: { sheet: "AUTRES_AFFILIATIONS", id: "id_affiliation_autre", actor: "id_autre_acteur", prefix: "AFAUT", fields: ["entite", "date_debut", "date_fin", "id_statut_affiliation", "observation"] },
} as const
const actorSheets = { athlete: ["ATHLETES", "id_athlete"], coach: ["COACHS", "id_coach"], medecin: ["MEDECINS", "id_medecin"], officiel: ["OFFICIELS", "id_officiel"], autre: ["AUTRES", "id_autre_acteur"] } as const
const actorLabels = { athlete: "athlete", coach: "coach", medecin: "medecin", officiel: "officiel", autre: "autreActeur" } as const
const coachFunctions = new Set(["FON005", "FON006", "FON099"])
const entityTypes: Record<string, { sheet: string; block: "referentiel" | "structure"; id: string; label: string }> = {
  STR000: { sheet: "FEDERATION", block: "referentiel", id: "id_federation", label: "nom_officiel" }, STR001: { sheet: "LIGUES", block: "structure", id: "id_ligue", label: "nom_ligue" },
  STR002: { sheet: "ENTENTES", block: "structure", id: "id_entente", label: "nom_entente" }, STR003: { sheet: "CLUBS", block: "structure", id: "id_club", label: "nom_club" },
}
const clean = (value: unknown) => String(value ?? "").trim()
const fullName = (row?: SheetRow) => row ? pickFirst(row, ["nom_complet", "nom_complet_athlete", "nom_complet_coach", "nom_complet_medecin", "nom_complet_officiel"]) || [row.prenom, row.nom].filter(Boolean).join(" ").trim() : ""

export function generateAffiliationId(kind: AffiliationKind, rows: SheetRow[]): string {
  const config = affiliationConfig[kind], pattern = new RegExp(`^${config.prefix}-(\\d{6})$`), used = new Set(rows.map((row) => clean(row[config.id])))
  let next = Math.max(0, ...[...used].map((id) => Number(id.match(pattern)?.[1] ?? NaN)).filter(Number.isFinite)) + 1
  let id = `${config.prefix}-${String(next).padStart(6, "0")}`
  while (used.has(id)) id = `${config.prefix}-${String(++next).padStart(6, "0")}`
  return id
}

export function validateAffiliationInput(kind: AffiliationKind, body: unknown) {
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {}, config = affiliationConfig[kind]
  const values = Object.fromEntries(config.fields.map((field) => [field, clean(source[field])])), errors: AffiliationFields = {}
  const required = kind === "officiel" ? ["id_fonction", "id_type_entite", "id_entite", "date_debut", "id_statut_affiliation"] : kind === "autre" ? ["entite", "date_debut", "id_statut_affiliation"] : kind === "coach" ? ["id_equipe", "id_fonction", "date_debut", "id_statut_affiliation"] : ["id_equipe", "date_debut", "id_statut_affiliation"]
  for (const field of required) if (!values[field]) errors[field] = "Ce champ est obligatoire."
  if (values.date_debut && !/^\d{4}-\d{2}-\d{2}$/.test(values.date_debut)) errors.date_debut = "Date invalide."
  if (values.date_fin && !/^\d{4}-\d{2}-\d{2}$/.test(values.date_fin)) errors.date_fin = "Date invalide."
  if (values.date_fin && values.date_debut && values.date_fin < values.date_debut) errors.date_fin = "La date de fin ne peut pas précéder la date de début."
  if (values.id_statut_affiliation === "SAF002" && !values.date_fin) errors.date_fin = "La date de fin est obligatoire pour une affiliation terminée."
  if (kind === "coach" && values.id_fonction && !coachFunctions.has(values.id_fonction)) errors.id_fonction = "Fonction de coach invalide."
  if (kind === "officiel" && ![...Object.keys(entityTypes), "STR099"].includes(values.id_type_entite)) errors.id_type_entite = "Type d’entité invalide."
  return { values, errors }
}

type Deps = { readRows: typeof readSheetRows; writeRow: typeof writeSheetRowByHeaders }
const defaults: Deps = { readRows: readSheetRows, writeRow: writeSheetRowByHeaders }
async function rowsOrUnavailable(deps: Deps, block: "acteurs" | "structure" | "referentiel", sheet: string) { try { return await deps.readRows({ block, sheet, range: "A:ZZ" }) } catch { throw new AffiliationError("REFERENCE_INDISPONIBLE", `La liste ${sheet} est indisponible.`, 503) } }
async function requireRow(deps: Deps, block: "acteurs" | "structure" | "referentiel", sheet: string, idHeader: string, id: string, field: string) { if (!(await rowsOrUnavailable(deps, block, sheet)).some((row) => clean(row[idHeader]) === id)) throw new AffiliationError("REFERENCE_INVALIDE", "Une sélection est introuvable.", 422, { [field]: "Valeur inconnue." }) }
const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart <= (bEnd || "9999-12-31") && bStart <= (aEnd || "9999-12-31")

export async function listAffiliations(kind: AffiliationKind, filters: string | AffiliationFilters = {}, deps: Deps = defaults) {
  const query = typeof filters === "string" ? { actorId: filters } : filters, config = affiliationConfig[kind]
  const [rows, statuses, actors] = await Promise.all([deps.readRows({ block: "affiliations", sheet: config.sheet, range: "A:ZZ", fresh: true }), rowsOrUnavailable(deps, "referentiel", "STATUTS_AFFILIATION"), rowsOrUnavailable(deps, "acteurs", actorSheets[kind][0])])
  const statusById = new Map(statuses.map((r) => [clean(r.id_statut_affiliation), r])), actorById = new Map(actors.map((r) => [clean(r[actorSheets[kind][1]]), r]))
  let teams: SheetRow[] = [], clubs: SheetRow[] = [], functions: SheetRow[] = []
  if (["athlete", "coach", "medecin"].includes(kind)) [teams, clubs] = await Promise.all([rowsOrUnavailable(deps, "structure", "EQUIPES"), rowsOrUnavailable(deps, "structure", "CLUBS")])
  if (["coach", "officiel"].includes(kind)) functions = await rowsOrUnavailable(deps, "referentiel", "FONCTIONS")
  const teamById = new Map(teams.map((r) => [clean(r.id_equipe), r])), clubById = new Map(clubs.map((r) => [clean(r.id_club), r])), functionById = new Map(functions.map((r) => [clean(r.id_fonction), r]))
  const entityRows = new Map<string, Map<string, SheetRow>>()
  if (kind === "officiel") for (const [type, ref] of Object.entries(entityTypes)) entityRows.set(type, new Map((await rowsOrUnavailable(deps, ref.block, ref.sheet)).map((r) => [clean(r[ref.id]), r])))
  return rows.map((row) => {
    const actorId = clean(row[config.actor]), actor = actorById.get(actorId), item: AffiliationFields = { id: clean(row[config.id]), [config.id]: clean(row[config.id]), actorId, [config.actor]: actorId }
    for (const field of config.fields) item[field] = clean(row[field])
    item[actorLabels[kind]] = fullName(actor); item.nomActeur = fullName(actor); item.id_sexe = clean(actor?.id_sexe); item.sexe = item.id_sexe === "SEX001" ? "M" : item.id_sexe === "SEX002" ? "F" : ""; item.statut = clean(statusById.get(item.id_statut_affiliation)?.nom_statut_affiliation) || item.id_statut_affiliation; item.fonction = clean(functionById.get(item.id_fonction)?.nom_fonction)
    const anomalies: string[] = []; if (!actor) anomalies.push(`Acteur introuvable : ${actorId}`)
    if (["athlete", "coach", "medecin"].includes(kind)) { const team = teamById.get(item.id_equipe), clubId = clean(team?.id_club), club = clubById.get(clubId); item.equipeId = item.id_equipe; item.equipe = clean(team?.nom_equipe); item.clubId = clubId; item.club = clean(club?.nom_club); if (!team) anomalies.push(`Équipe introuvable : ${item.id_equipe}`); else if (!club) anomalies.push(`Club introuvable : ${clubId}`) }
    if (kind === "officiel") { const ref = entityTypes[item.id_type_entite], entity = entityRows.get(item.id_type_entite)?.get(item.id_entite); item.typeEntite = item.id_type_entite; item.entiteId = item.id_entite; item.entite = ref && entity ? clean(entity[ref.label]) : ""; if (item.id_type_entite === "STR099") anomalies.push("L’entité AUTRE ne possède pas de référentiel résolvable."); else if (!ref || !entity) anomalies.push(`Entité introuvable : ${item.id_entite}`) }
    item.anomalie = anomalies.join(" · "); item.dateDebut = item.date_debut; item.dateFin = item.date_fin; return item
  }).filter((i) => (!query.actorId || i.actorId === query.actorId) && (!query.equipeId || i.equipeId === query.equipeId) && (!query.clubId || i.clubId === query.clubId) && (!query.typeEntiteId || i.id_type_entite === query.typeEntiteId) && (!query.entiteId || i.id_entite === query.entiteId)).sort((a, b) => b.date_debut.localeCompare(a.date_debut))
}
export const listAthleteAffiliations = (filters: AffiliationFilters = {}, deps: Deps = defaults) => listAffiliations("athlete", filters, deps)

export async function mutateAffiliation(kind: AffiliationKind, mode: "create" | "update", actorId: string, body: unknown, id?: string, deps: Deps = defaults) {
  if (!actorId) throw new AffiliationError("ACTEUR_REQUIS", "Identifiant acteur requis.", 422)
  const config = affiliationConfig[kind], rows = await deps.readRows({ block: "affiliations", sheet: config.sheet, range: "A:ZZ", fresh: true }), current = mode === "update" ? rows.find((r) => clean(r[config.id]) === clean(id)) : undefined
  if (mode === "update" && (!current || clean(current[config.actor]) !== actorId)) throw new AffiliationError("INTROUVABLE", "Affiliation introuvable pour cet acteur.", 404)
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {}, merged = current ? Object.fromEntries(config.fields.map((f) => [f, Object.prototype.hasOwnProperty.call(source, f) ? source[f] : current[f]])) : body
  const { values, errors } = validateAffiliationInput(kind, merged); if (Object.keys(errors).length) throw new AffiliationError("VALIDATION", "Veuillez corriger les champs indiqués.", 422, errors)
  await requireRow(deps, "acteurs", actorSheets[kind][0], actorSheets[kind][1], actorId, config.actor); await requireRow(deps, "referentiel", "STATUTS_AFFILIATION", "id_statut_affiliation", values.id_statut_affiliation, "id_statut_affiliation")
  if (["athlete", "coach", "medecin"].includes(kind)) await requireRow(deps, "structure", "EQUIPES", "id_equipe", values.id_equipe, "id_equipe")
  if (kind === "coach") await requireRow(deps, "referentiel", "FONCTIONS", "id_fonction", values.id_fonction, "id_fonction")
  if (kind === "officiel") { await requireRow(deps, "referentiel", "FONCTIONS", "id_fonction", values.id_fonction, "id_fonction"); const target = entityTypes[values.id_type_entite]; if (target) await requireRow(deps, target.block, target.sheet, target.id, values.id_entite, "id_entite") }
  const exact = rows.find((r) => clean(r[config.actor]) === actorId && clean(r[config.id]) !== clean(id) && config.fields.every((f) => clean(r[f]) === values[f]))
  if (mode === "create" && exact) return (await listAffiliations(kind, { actorId }, deps)).find((item) => item.id === clean(exact[config.id]))!
  const targets = kind === "officiel" ? ["id_type_entite", "id_entite"] : kind === "autre" ? ["entite"] : ["id_equipe"]
  if (rows.some((r) => clean(r[config.actor]) === actorId && clean(r[config.id]) !== clean(id) && targets.every((f) => clean(r[f]) === values[f]) && overlaps(clean(r.date_debut), clean(r.date_fin), values.date_debut, values.date_fin))) throw new AffiliationError("CHEVAUCHEMENT", "Cette période chevauche une affiliation existante pour la même affectation.", 409, { date_debut: "Période en conflit.", date_fin: "Période en conflit." })
  const affiliationId = mode === "create" ? generateAffiliationId(kind, rows) : clean(id); await deps.writeRow({ block: "affiliations", sheet: config.sheet, idHeader: config.id, id: affiliationId, values: { [config.actor]: actorId, ...values }, mode })
  const confirmed = (await listAffiliations(kind, { actorId }, deps)).find((i) => i.id === affiliationId); if (!confirmed) throw new AffiliationError("ECRITURE_NON_CONFIRMEE", "L’écriture n’a pas pu être confirmée.", 503); return confirmed
}
