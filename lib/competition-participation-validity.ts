import type { SheetRow } from "@/lib/google-sheets";

export type ParticipationValidity = "VALIDE" | "NON_VALIDE" | "NON_APPLICABLE" | "INDETERMINE";
export type ParticipationValidityResult = {
  numeroLicence: string | null;
  idLicenceSource: string | null;
  statutParticipation: ParticipationValidity;
  raisonStatutParticipation: string;
  dateDebutValidite: string | null;
  dateFinValidite: string | null;
  qualiteDonnees: "PLUSIEURS_LICENCES_CONCURRENTES" | "NUMERO_MANQUANT" | null;
};

const clean = (value: unknown) => String(value ?? "").trim();
const actorTypesWithLicense = new Set(["TAC002", "TAC003", "TAC004", "TAC005"]);
const admissible = new Set(["STL001", "STL002", "ACTIVE", "EXPIREE"]);
const statusReason: Record<string, string> = { STL003: "Licence suspendue", SUSPENDUE: "Licence suspendue", STL004: "Licence clôturée", CLOTUREE: "Licence clôturée", STL005: "Licence annulée", ANNULEE: "Licence annulée" };

function result(status: ParticipationValidity, reason: string, license?: SheetRow, duplicate = false): ParticipationValidityResult {
  const number = clean(license?.numero_licence) || null;
  return {
    numeroLicence: number,
    idLicenceSource: clean(license?.id_licence) || null,
    statutParticipation: status,
    raisonStatutParticipation: reason,
    dateDebutValidite: clean(license?.date_debut_validite) || null,
    dateFinValidite: clean(license?.date_fin_validite) || null,
    qualiteDonnees: duplicate ? "PLUSIEURS_LICENCES_CONCURRENTES" : license && !number ? "NUMERO_MANQUANT" : null,
  };
}

function licenseStatus(row: SheetRow) { return clean(row.id_statut_licence || row.statut_licence).normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase(); }
function descending(...keys: string[]) { return (a: SheetRow, b: SheetRow) => { for (const key of keys) { const order = clean(b[key]).localeCompare(clean(a[key])); if (order) return order; } return clean(b.id_licence).localeCompare(clean(a.id_licence)); }; }

export function calculateCompetitionParticipationValidity({ competition, intervenant, athleteLicenses, actorLicenses }: { competition: SheetRow; intervenant: SheetRow; athleteLicenses: SheetRow[]; actorLicenses: SheetRow[] }): ParticipationValidityResult {
  const typeId = clean(intervenant.id_type_acteur), actorId = clean(intervenant.id_acteur);
  if (typeId === "TAC099") return result("NON_APPLICABLE", "Aucune licence requise pour ce type d’intervenant");
  if (typeId === "TAC001") {
    const seasonId = clean(competition.id_saison);
    if (!seasonId) return result("INDETERMINE", "La compétition n’a pas de saison");
    const matches = athleteLicenses.filter((row) => clean(row.id_athlete) === actorId && clean(row.id_saison) === seasonId).sort(descending("date_delivrance"));
    if (!matches.length) return result("NON_VALIDE", `Aucune licence trouvée pour la saison ${seasonId}`);
    const eligible = matches.filter((row) => admissible.has(licenseStatus(row)));
    if (eligible.length) return result("VALIDE", `Licence trouvée pour la saison ${seasonId}`, eligible[0], matches.length > 1);
    const selected = matches[0], status = licenseStatus(selected);
    if (status === "STL099" || status === "AUTRE") return result("INDETERMINE", "Statut de licence indéterminé", selected, matches.length > 1);
    return result("NON_VALIDE", statusReason[status] || "Aucune licence admissible pour la saison de la compétition", selected, matches.length > 1);
  }
  if (!actorTypesWithLicense.has(typeId)) return result("INDETERMINE", "Type d’acteur non reconnu");
  const start = clean(competition.date_debut), end = clean(competition.date_fin);
  if (!start || !end) return result("INDETERMINE", "Les dates de la compétition sont incomplètes");
  const matches = actorLicenses.filter((row) => clean(row.id_type_acteur) === typeId && clean(row.id_acteur) === actorId).sort(descending("date_debut_validite", "date_delivrance"));
  if (!matches.length) return result("NON_VALIDE", "Aucune licence trouvée");
  const covering = matches.filter((row) => admissible.has(licenseStatus(row)) && clean(row.date_debut_validite) <= start && clean(row.date_fin_validite) >= end);
  if (covering.length) return result("VALIDE", "La licence couvre toute la compétition", covering[0], covering.length > 1);
  const selected = matches[0], status = licenseStatus(selected);
  if (statusReason[status]) return result("NON_VALIDE", statusReason[status], selected);
  if (status === "STL099" || status === "AUTRE") return result("INDETERMINE", "Statut de licence indéterminé", selected);
  if (!clean(selected.date_debut_validite) || !clean(selected.date_fin_validite)) return result("INDETERMINE", "Les dates de validité de la licence sont incomplètes", selected);
  if (clean(selected.date_debut_validite) > start) return result("NON_VALIDE", "La licence commence après le début de la compétition", selected);
  return result("NON_VALIDE", "La licence expire avant la fin de la compétition", selected);
}

export function buildCompetitionLicenseIndexes(athleteLicenses: SheetRow[], actorLicenses: SheetRow[]) {
  const athletes = new Map<string, SheetRow[]>(), actors = new Map<string, SheetRow[]>();
  for (const row of athleteLicenses) { const key = `${clean(row.id_athlete)}::${clean(row.id_saison)}`; athletes.set(key, [...(athletes.get(key) ?? []), row]); }
  for (const row of actorLicenses) { const key = `${clean(row.id_type_acteur)}::${clean(row.id_acteur)}`; actors.set(key, [...(actors.get(key) ?? []), row]); }
  return { athletes, actors };
}

export function enrichCompetitionIntervenants(competition: SheetRow, intervenants: SheetRow[], athleteLicenses: SheetRow[], actorLicenses: SheetRow[]) {
  const indexes = buildCompetitionLicenseIndexes(athleteLicenses, actorLicenses);
  return intervenants.map((intervenant) => {
    const typeId = clean(intervenant.id_type_acteur), actorId = clean(intervenant.id_acteur);
    return { intervenant, validity: calculateCompetitionParticipationValidity({ competition, intervenant, athleteLicenses: typeId === "TAC001" ? indexes.athletes.get(`${actorId}::${clean(competition.id_saison)}`) ?? [] : [], actorLicenses: actorTypesWithLicense.has(typeId) ? indexes.actors.get(`${typeId}::${actorId}`) ?? [] : [] }) };
  });
}
