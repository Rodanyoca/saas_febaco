export interface Ligue {
  __key?: string
  id: string
  nom: string
  pseudo: string
  provinceId?: string
  province: string
  anneeCreation?: string
  dateAffiliation?: string
  email?: string
  presidentId?: string
  presidentNom?: string
  presidentTelephone?: string
  presidentEmail?: string
  secretaireId?: string
  secretaireNom?: string
  secretaireTelephone?: string
  secretaireEmail?: string
  statut: string
}

export interface Entente {
  id: string
  ligueId?: string
  villeId?: string
  ville?: string
  nom: string
  pseudo: string
  ligue: string
  province: string
  email?: string
  contact?: string
  contactTelephone?: string
  statut: string
}

export interface Club {
  id: string
  villeId?: string
  ville?: string
  ligueId?: string
  ententeId?: string
  ligueKey?: string
  ententeKey?: string
  nom: string
  categorie?: string
  version?: string
  dateAffiliation?: string
  avatarUrl?: string
  logoUrl?: string
  logo_drive_id?: string
  logo_drive_url?: string
  contact?: string
  contactTelephone?: string
  email?: string
  president?: string
  responsable?: string
  secretaire?: string
  observation?: string
  province: string
  ligue: string
  entente: string
  nombreEquipes: number
  nombreAthletes?: number
  statut: string
}

export interface Equipe {
  __key?: string
  id: string
  ligueId?: string
  ententeId?: string
  clubId?: string
  nom: string
  club: string
  entente: string
  ligue: string
  province: string
  categorie: string
  genre: string
  coach: string
  saison?: string
  statut: string
}

export interface Athlete {
  __key?: string
  id: string
  clubId?: string
  equipeId?: string
  idNational?: string
  idFiba?: string
  nom: string
  prenom: string
  nomComplet?: string
  sexe: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  telephone?: string
  email?: string
  adresse?: string
  avatarUrl?: string
  avatar_drive_id?: string
  avatar_drive_url?: string
  province: string
  ligue: string
  entente: string
  club: string
  equipe: string
  dateDebut?: string
  dateFin?: string
  categorie: string
  numeroMaillot: string
  poste: string
  statut: string
}

export interface Transfert {
  __key?: string
  id: string
  athleteId?: string
  athleteNom: string
  equipeOrigineId?: string
  equipeOrigine: string
  clubOrigineId?: string
  clubOrigine: string
  equipeBeneficiaireId?: string
  equipeBeneficiaire: string
  clubBeneficiaireId?: string
  clubBeneficiaire: string
  typeTransfert: string
  saison: string
  dateDebut: string
  dateFin: string
  statut: string
  observation: string
}

export interface AthleteLicence {
  __key?: string
  id: string
  athleteId?: string
  athleteNom: string
  affiliationId?: string
  equipeId?: string
  equipeNom: string
  clubId?: string
  clubNom: string
  structure: string
  saison: string
  numero: string
  dateDelivrance: string
  dateFinValidite: string
  statut: string
  observation: string
}

export interface Competition {
  __key?: string
  id: string
  nom: string
  typeCompetitionId?: string
  typeCompetition: string
  disciplineId: string
  discipline: string
  saisonId?: string
  saison: string
  categorie: string
  genre: string
  niveau: string
  dateDebut: string
  dateFin: string
    pays: string
    lieu?: string
    numeroEdition?: string
  statut: string
  observation: string
}

export interface CompetitionParticipant {
  __key?: string
  id: string
  competitionId: string
  competitionNom: string
  athleteId: string
  athleteNom: string
  avatarUrl?: string
  saison: string
  sexe: string
  posteId: string
  posteNom: string
  equipeId: string
  equipeNom: string
  clubId: string
  clubNom: string
  categorie: string
  genre: string
  statut: string
  observation: string
}

export interface CompetitionUnite {
  __key?: string
  id: string
  competitionId: string
  competitionNom: string
  saison: string
  equipeId: string
  equipeNom: string
  clubId: string
  clubNom: string
  categorie: string
  genre: string
  poule: string
  statut: string
}

export interface CompetitionResultat {
  __key?: string
  id: string
  competitionId: string
  competitionNom: string
  dateMatch: string
  heureMatch: string
  phase: string
  classementPoule: string
  poule: string
  uniteAId: string
  uniteANom: string
  uniteBId: string
  uniteBNom: string
  qt1A: string
  qt1B: string
  qt2A: string
  qt2B: string
  qt3A: string
  qt3B: string
  qt4A: string
  qt4B: string
  prolongationA: string
  prolongationB: string
  scoreTotalA: string
  scoreTotalB: string
  vainqueurId: string
  vainqueur: string
  statut: string
}

export interface CompetitionClassement {
  __key?: string
  id: string
  coteUnite: string
  resultatId: string
  competitionId: string
  competitionNom: string
  phase: string
  poule: string
  uniteId: string
  uniteNom: string
  adversaireId: string
  adversaireNom: string
  resultatMatch: string
  matchJoue: string
  victoire: string
  defaite: string
  nul: string
  points: string
  scorePour: string
  scoreContre: string
  difference: string
  rang: string
}

export interface EquipeNationale {
  __key?: string
  id: string
  nom: string
  discipline: string
  categorie: string
  sexe: string
  saison: string
  statut: string
}

export interface SelectionEquipeNationale {
  __key?: string
  id: string
  equipeNationaleId: string
  equipeNationaleNom: string
  saison: string
  athleteId: string
  athleteNom: string
  sexe: string
  posteId: string
  posteNom: string
  equipeId: string
  equipeNom: string
  clubId: string
  clubNom: string
  statutSelection: string
  observation: string
}

export interface CompetitionEquipeNationale {
  __key?: string
  id: string
  equipeNationaleId: string
  equipeNationaleNom: string
  discipline: string
  categorie: string
  sexe: string
  competitionId: string
  competitionNom: string
  typeCompetition: string
  disciplineId: string
  saison: string
  dateDebut: string
  dateFin: string
  statutParticipation: string
}

export interface EquipeNationaleParticipant {
  __key?: string
  id: string
  participationId: string
  equipeNationaleId: string
  equipeNationaleNom: string
  selectionId: string
  athleteId: string
  athleteNom: string
  avatarUrl?: string
  equipeId: string
  equipeNom: string
  clubId: string
  clubNom: string
  poste: string
  statutParticipant: string
  observation: string
}

export interface ResultatEquipeNationale {
  __key?: string
  id: string
  participationId: string
  equipeNationaleId: string
  equipeNationaleNom: string
  discipline: string
  categorie: string
  sexe: string
  competitionId: string
  competitionNom: string
  dateMatch: string
  phase: string
  nomAdversaire: string
  paysAdversaire: string
  qt1A: string
  qt1B: string
  qt2A: string
  qt2B: string
  qt3A: string
  qt3B: string
  qt4A: string
  qt4B: string
  prolongationA: string
  prolongationB: string
  scoreTotalA: string
  scoreTotalB: string
  uniteVainqueurId: string
  uniteVainqueurNom: string
  statutMatch: string
}

export type EquipeNationaleSelection = SelectionEquipeNationale
export type EquipeNationaleCompetition = CompetitionEquipeNationale
export type EquipeNationaleResultat = ResultatEquipeNationale

export interface Coach {
  __key?: string
  id: string
  clubId?: string
  equipeId?: string
  idNational?: string
  idFiba?: string
  nom: string
  prenom: string
  nomComplet?: string
  avatarUrl?: string
  avatar_drive_id?: string
  avatar_drive_url?: string
  sexe: string
  dateNaissance: string
  lieuNaissance?: string
  nationalite: string
  adresse?: string
  niveau: string
  specialite: string
  province: string
  ligue: string
  entente: string
  club: string
  equipe: string
  telephone?: string
  email?: string
  statut: string
}

export interface CoachAffiliation {
  __key?: string
  id: string
  coachId?: string
  coachNom: string
  typeAffiliation: string
  saison: string
  equipeId?: string
  equipeNom: string
  clubId?: string
  clubNom: string
  equipeNationaleId?: string
  equipeNationaleNom: string
  fonction: string
  dateDebut: string
  dateFin: string
  statut: string
  observation: string
}

export interface Arbitre {
  __key?: string
  id: string
  clubId?: string
  equipeId?: string
  idNational?: string
  idFiba?: string
  nom: string
  prenom: string
  nomComplet?: string
  sexe: string
  dateNaissance: string
  nationalite: string
  avatarUrl?: string
  avatar_drive_id?: string
  avatar_drive_url?: string
  telephone?: string
  email?: string
  tailleCm?: number
  poidsKg?: number
  niveau: string
  province: string
  ligue: string
  entente: string
  statut: string
}

export interface Officiel {
  __key?: string
  id: string
  idNational?: string
  idFiba?: string
  clubId?: string
  equipeId?: string
  nom: string
  prenom: string
  nomComplet?: string
  sexe: string
  dateNaissance: string
  nationalite: string
  avatarUrl?: string
  avatar_drive_id?: string
  avatar_drive_url?: string
  telephone?: string
  email?: string
  fonction: string
  structure: string
  province: string
  ligue: string
  entente: string
  club: string
  statut: string
  observation?: string
}

export interface OfficielMandat {
  __key?: string
  id: string
  acteurId?: string
  acteurNom: string
  fonction: string
  structureId?: string
  structureNom: string
  dateDebut: string
  dateFin: string
  statut: string
  observation: string
}

export interface Medecin {
  __key?: string
  id: string
  idNational?: string
  idFiba?: string
  clubId?: string
  equipeId?: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  avatarUrl?: string
  avatar_drive_id?: string
  avatar_drive_url?: string
  telephone?: string
  email?: string
  specialite: string
  structureMedicale: string
  province: string
  ligue: string
  entente: string
  club: string
  statut: string
}

export interface MedecinAffiliation {
  __key?: string
  id: string
  medecinId?: string
  medecinNom: string
  typeAffiliation: string
  saison: string
  equipeId?: string
  equipeNom: string
  clubId?: string
  clubNom: string
  equipeNationaleId?: string
  equipeNationaleNom: string
  fonction: string
  dateDebut: string
  dateFin: string
  statut: string
  observation: string
}

export function getFilterOptions<T extends object>(
  data: T[],
  key: keyof T | string
): { value: string; label: string }[] {
  const k = String(key)
  const seen = new Set<string>()
  const options: { value: string; label: string }[] = []

  for (const item of data) {
    const raw = String(item[k as keyof T] ?? "")
    const value = raw.trim()
    if (!value) continue

    const dedupeKey = value.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    options.push({ value, label: value })
  }

  return options
}
