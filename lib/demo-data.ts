// Donnees de demonstration pour FEBACO
// Ces données seront remplacées par l'API Google Sheets

export interface Ligue {
  [key: string]: unknown
  id: string
  nom: string
  pseudo: string
  province: string
  statut: string
}

export interface Entente {
  [key: string]: unknown
  id: string
  nom: string
  pseudo: string
  ligueId?: string
  ligue: string
  province: string
  statut: string
}

export interface Club {
  [key: string]: unknown
  id: string
  nom: string
  categorie: string
  entente: string
  ligue: string
  province: string
  statut: string
  nombreEquipes: number
  nombreAthletes: number
}

export interface Equipe {
  [key: string]: unknown
  id: string
  nom: string
  club: string
  entente: string
  ligue: string
  province: string
  categorie: string
  genre: string
  coach?: string
  statut: string
}

export interface Athlete {
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  province: string
  ligue: string
  entente: string
  club: string
  equipe: string
  categorie: string
  numeroMaillot: string
  poste: string
  statut: string
}

export interface Coach {
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  niveau: string
  specialite: string
  province: string
  ligue: string
  entente: string
  club: string
  equipe: string
  statut: string
}

export interface Arbitre {
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  niveau: string
  province: string
  ligue: string
  entente: string
  statut: string
}

export interface Officiel {
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  fonction: string
  structure: string
  province: string
  ligue: string
  entente: string
  club: string
  statut: string
}

export interface Medecin {
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  specialite: string
  structureMedicale: string
  province: string
  ligue: string
  entente: string
  club: string
  statut: string
}

// Données de démonstration
export const ligues: Ligue[] = [
  { id: "LIG001", nom: "Ligue de Kinshasa", pseudo: "LIKIN", province: "Kinshasa", statut: "Actif" },
  { id: "LIG002", nom: "Ligue du Katanga", pseudo: "LIKAT", province: "Haut-Katanga", statut: "Actif" },
  { id: "LIG003", nom: "Ligue du Kongo Central", pseudo: "LIKOC", province: "Kongo Central", statut: "Actif" },
  { id: "LIG004", nom: "Ligue du Sud-Kivu", pseudo: "LISUK", province: "Sud-Kivu", statut: "Actif" },
  { id: "LIG005", nom: "Ligue du Nord-Kivu", pseudo: "LINOK", province: "Nord-Kivu", statut: "Inactif" },
  { id: "LIG006", nom: "Ligue de l'Équateur", pseudo: "LIEQU", province: "Équateur", statut: "Actif" },
]

export const ententes: Entente[] = [
  { id: "ENT001", nom: "Entente de la Gombe", pseudo: "EGOM", ligue: "Ligue de Kinshasa", province: "Kinshasa", statut: "Actif" },
  { id: "ENT002", nom: "Entente de Ngaliema", pseudo: "ENGA", ligue: "Ligue de Kinshasa", province: "Kinshasa", statut: "Actif" },
  { id: "ENT003", nom: "Entente de Lubumbashi", pseudo: "ELUB", ligue: "Ligue du Katanga", province: "Haut-Katanga", statut: "Actif" },
  { id: "ENT004", nom: "Entente de Kolwezi", pseudo: "EKOL", ligue: "Ligue du Katanga", province: "Lualaba", statut: "Actif" },
  { id: "ENT005", nom: "Entente de Matadi", pseudo: "EMAT", ligue: "Ligue du Kongo Central", province: "Kongo Central", statut: "Actif" },
  { id: "ENT006", nom: "Entente de Bukavu", pseudo: "EBUK", ligue: "Ligue du Sud-Kivu", province: "Sud-Kivu", statut: "Actif" },
]

export const clubs: Club[] = [
  { id: "CLB001", nom: "BC Renaissance", categorie: "Elite", entente: "Entente de la Gombe", ligue: "Ligue de Kinshasa", province: "Kinshasa", statut: "Actif", nombreEquipes: 4, nombreAthletes: 48 },
  { id: "CLB002", nom: "AS Dragons", categorie: "Division 1", entente: "Entente de Ngaliema", ligue: "Ligue de Kinshasa", province: "Kinshasa", statut: "Actif", nombreEquipes: 3, nombreAthletes: 36 },
  { id: "CLB003", nom: "BC Lubumbashi", categorie: "Elite", entente: "Entente de Lubumbashi", ligue: "Ligue du Katanga", province: "Haut-Katanga", statut: "Actif", nombreEquipes: 5, nombreAthletes: 60 },
  { id: "CLB004", nom: "Sporting Club Kolwezi", categorie: "Division 1", entente: "Entente de Kolwezi", ligue: "Ligue du Katanga", province: "Lualaba", statut: "Actif", nombreEquipes: 2, nombreAthletes: 24 },
  { id: "CLB005", nom: "BC Matadi", categorie: "Division 2", entente: "Entente de Matadi", ligue: "Ligue du Kongo Central", province: "Kongo Central", statut: "Actif", nombreEquipes: 2, nombreAthletes: 20 },
  { id: "CLB006", nom: "AS Bukavu", categorie: "Elite", entente: "Entente de Bukavu", ligue: "Ligue du Sud-Kivu", province: "Sud-Kivu", statut: "Actif", nombreEquipes: 4, nombreAthletes: 44 },
  { id: "CLB007", nom: "Phoenix BC", categorie: "Division 1", entente: "Entente de la Gombe", ligue: "Ligue de Kinshasa", province: "Kinshasa", statut: "Suspendu", nombreEquipes: 2, nombreAthletes: 18 },
  { id: "CLB008", nom: "Étoile du Congo", categorie: "Elite", entente: "Entente de Ngaliema", ligue: "Ligue de Kinshasa", province: "Kinshasa", statut: "Actif", nombreEquipes: 3, nombreAthletes: 35 },
]

export const athletes: Athlete[] = [
  { id: "ATH001", nom: "MBALA", prenom: "Junior", sexe: "M", dateNaissance: "1998-05-12", lieuNaissance: "Kinshasa", nationalite: "Congolaise", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", club: "BC Renaissance", equipe: "Senior Hommes", categorie: "Senior", numeroMaillot: "23", poste: "Ailier", statut: "Actif" },
  { id: "ATH002", nom: "KALAMBA", prenom: "Patrick", sexe: "M", dateNaissance: "2000-03-22", lieuNaissance: "Lubumbashi", nationalite: "Congolaise", province: "Haut-Katanga", ligue: "Ligue du Katanga", entente: "Entente de Lubumbashi", club: "BC Lubumbashi", equipe: "Senior Hommes", categorie: "Senior", numeroMaillot: "10", poste: "Meneur", statut: "Actif" },
  { id: "ATH003", nom: "MUTOMBO", prenom: "Sarah", sexe: "F", dateNaissance: "2002-08-15", lieuNaissance: "Kinshasa", nationalite: "Congolaise", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de Ngaliema", club: "AS Dragons", equipe: "Senior Dames", categorie: "Senior", numeroMaillot: "5", poste: "Pivot", statut: "Actif" },
  { id: "ATH004", nom: "LUKAKU", prenom: "Emmanuel", sexe: "M", dateNaissance: "1999-11-30", lieuNaissance: "Matadi", nationalite: "Congolaise", province: "Kongo Central", ligue: "Ligue du Kongo Central", entente: "Entente de Matadi", club: "BC Matadi", equipe: "Senior Hommes", categorie: "Senior", numeroMaillot: "7", poste: "Ailier fort", statut: "Actif" },
  { id: "ATH005", nom: "KAMBALA", prenom: "Divine", sexe: "F", dateNaissance: "2004-02-18", lieuNaissance: "Bukavu", nationalite: "Congolaise", province: "Sud-Kivu", ligue: "Ligue du Sud-Kivu", entente: "Entente de Bukavu", club: "AS Bukavu", equipe: "U20 Dames", categorie: "U20", numeroMaillot: "12", poste: "Arrière", statut: "Actif" },
  { id: "ATH006", nom: "NGOY", prenom: "Christian", sexe: "M", dateNaissance: "2001-07-25", lieuNaissance: "Kolwezi", nationalite: "Congolaise", province: "Lualaba", ligue: "Ligue du Katanga", entente: "Entente de Kolwezi", club: "Sporting Club Kolwezi", equipe: "Senior Hommes", categorie: "Senior", numeroMaillot: "15", poste: "Pivot", statut: "Actif" },
  { id: "ATH007", nom: "MWAMBA", prenom: "Gloire", sexe: "M", dateNaissance: "2003-01-08", lieuNaissance: "Kinshasa", nationalite: "Congolaise", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", club: "BC Renaissance", equipe: "U20 Hommes", categorie: "U20", numeroMaillot: "33", poste: "Ailier", statut: "Actif" },
  { id: "ATH008", nom: "KASONGO", prenom: "Marie", sexe: "F", dateNaissance: "1997-09-14", lieuNaissance: "Lubumbashi", nationalite: "Congolaise", province: "Haut-Katanga", ligue: "Ligue du Katanga", entente: "Entente de Lubumbashi", club: "BC Lubumbashi", equipe: "Senior Dames", categorie: "Senior", numeroMaillot: "8", poste: "Meneur", statut: "Actif" },
  { id: "ATH009", nom: "TSHIMANGA", prenom: "Hervé", sexe: "M", dateNaissance: "1996-04-20", lieuNaissance: "Kinshasa", nationalite: "Congolaise", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de Ngaliema", club: "Étoile du Congo", equipe: "Senior Hommes", categorie: "Senior", numeroMaillot: "21", poste: "Arrière", statut: "Actif" },
  { id: "ATH010", nom: "KABONGO", prenom: "Esther", sexe: "F", dateNaissance: "2005-12-03", lieuNaissance: "Bukavu", nationalite: "Congolaise", province: "Sud-Kivu", ligue: "Ligue du Sud-Kivu", entente: "Entente de Bukavu", club: "AS Bukavu", equipe: "U18 Dames", categorie: "U18", numeroMaillot: "4", poste: "Ailier", statut: "Actif" },
]

export const coachs: Coach[] = [
  { id: "COA001", nom: "MUKENDI", prenom: "Jean-Pierre", sexe: "M", dateNaissance: "1975-06-10", nationalite: "Congolaise", niveau: "National", specialite: "Seniors", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", club: "BC Renaissance", equipe: "Senior Hommes", statut: "Actif" },
  { id: "COA002", nom: "MBUYI", prenom: "Claudine", sexe: "F", dateNaissance: "1982-11-25", nationalite: "Congolaise", niveau: "National", specialite: "Dames", province: "Haut-Katanga", ligue: "Ligue du Katanga", entente: "Entente de Lubumbashi", club: "BC Lubumbashi", equipe: "Senior Dames", statut: "Actif" },
  { id: "COA003", nom: "LUNDA", prenom: "Albert", sexe: "M", dateNaissance: "1980-03-15", nationalite: "Congolaise", niveau: "Provincial", specialite: "Formation", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de Ngaliema", club: "AS Dragons", equipe: "U18 Hommes", statut: "Actif" },
  { id: "COA004", nom: "KASANDA", prenom: "Michel", sexe: "M", dateNaissance: "1978-09-08", nationalite: "Congolaise", niveau: "Fédéral", specialite: "Seniors", province: "Sud-Kivu", ligue: "Ligue du Sud-Kivu", entente: "Entente de Bukavu", club: "AS Bukavu", equipe: "Senior Hommes", statut: "Actif" },
  { id: "COA005", nom: "NGANDU", prenom: "Félicien", sexe: "M", dateNaissance: "1985-01-30", nationalite: "Congolaise", niveau: "Provincial", specialite: "Juniors", province: "Lualaba", ligue: "Ligue du Katanga", entente: "Entente de Kolwezi", club: "Sporting Club Kolwezi", equipe: "U20 Hommes", statut: "Actif" },
]

export const arbitres: Arbitre[] = [
  { id: "ARB001", nom: "KASHALA", prenom: "Victor", sexe: "M", dateNaissance: "1988-04-12", nationalite: "Congolaise", niveau: "FIBA", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", statut: "Actif" },
  { id: "ARB002", nom: "MWELA", prenom: "Brigitte", sexe: "F", dateNaissance: "1990-08-22", nationalite: "Congolaise", niveau: "National", province: "Haut-Katanga", ligue: "Ligue du Katanga", entente: "Entente de Lubumbashi", statut: "Actif" },
  { id: "ARB003", nom: "TSHILOMBO", prenom: "Éric", sexe: "M", dateNaissance: "1985-12-05", nationalite: "Congolaise", niveau: "National", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de Ngaliema", statut: "Actif" },
  { id: "ARB004", nom: "KABWE", prenom: "Josué", sexe: "M", dateNaissance: "1992-02-18", nationalite: "Congolaise", niveau: "Provincial", province: "Kongo Central", ligue: "Ligue du Kongo Central", entente: "Entente de Matadi", statut: "Actif" },
  { id: "ARB005", nom: "MUKALAY", prenom: "Sandra", sexe: "F", dateNaissance: "1995-07-30", nationalite: "Congolaise", niveau: "Provincial", province: "Sud-Kivu", ligue: "Ligue du Sud-Kivu", entente: "Entente de Bukavu", statut: "Actif" },
]

export const officiels: Officiel[] = [
  { id: "OFF001", nom: "KABAMBA", prenom: "Robert", sexe: "M", dateNaissance: "1970-05-15", nationalite: "Congolaise", fonction: "Président", structure: "FEBACO", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", club: "-", statut: "Actif" },
  { id: "OFF002", nom: "LWAMBA", prenom: "Marie-Claire", sexe: "F", dateNaissance: "1978-09-22", nationalite: "Congolaise", fonction: "Secrétaire Général", structure: "FEBACO", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de Ngaliema", club: "-", statut: "Actif" },
  { id: "OFF003", nom: "KALUBI", prenom: "François", sexe: "M", dateNaissance: "1975-03-10", nationalite: "Congolaise", fonction: "Président", structure: "Ligue du Katanga", province: "Haut-Katanga", ligue: "Ligue du Katanga", entente: "Entente de Lubumbashi", club: "-", statut: "Actif" },
  { id: "OFF004", nom: "MUTEBA", prenom: "Jeanne", sexe: "F", dateNaissance: "1982-11-08", nationalite: "Congolaise", fonction: "Trésorier", structure: "BC Renaissance", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", club: "BC Renaissance", statut: "Actif" },
  { id: "OFF005", nom: "NKONGOLO", prenom: "David", sexe: "M", dateNaissance: "1980-06-25", nationalite: "Congolaise", fonction: "Directeur Technique", structure: "FEBACO", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", club: "-", statut: "Actif" },
]

export const medecins: Medecin[] = [
  { id: "MED001", nom: "KABONGO", prenom: "Dr. Antoine", sexe: "M", dateNaissance: "1972-08-14", nationalite: "Congolaise", specialite: "Médecine du sport", structureMedicale: "Clinique des Sports Kinshasa", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de la Gombe", club: "BC Renaissance", statut: "Actif" },
  { id: "MED002", nom: "MWENZE", prenom: "Dr. Pauline", sexe: "F", dateNaissance: "1980-02-28", nationalite: "Congolaise", specialite: "Traumatologie", structureMedicale: "Hôpital Provincial Lubumbashi", province: "Haut-Katanga", ligue: "Ligue du Katanga", entente: "Entente de Lubumbashi", club: "BC Lubumbashi", statut: "Actif" },
  { id: "MED003", nom: "TSHISEKEDI", prenom: "Dr. Bruno", sexe: "M", dateNaissance: "1978-11-10", nationalite: "Congolaise", specialite: "Kinésithérapie", structureMedicale: "Centre Médical FEBACO", province: "Kinshasa", ligue: "Ligue de Kinshasa", entente: "Entente de Ngaliema", club: "AS Dragons", statut: "Actif" },
  { id: "MED004", nom: "LUKUSA", prenom: "Dr. Grace", sexe: "F", dateNaissance: "1985-05-20", nationalite: "Congolaise", specialite: "Médecine générale", structureMedicale: "Polyclinique Bukavu", province: "Sud-Kivu", ligue: "Ligue du Sud-Kivu", entente: "Entente de Bukavu", club: "AS Bukavu", statut: "Actif" },
]

// Statistiques globales
export const stats = {
  ligues: ligues.length,
  ententes: ententes.length,
  clubs: clubs.length,
  equipes: clubs.reduce((acc, club) => acc + club.nombreEquipes, 0),
  athletes: athletes.length,
  coachs: coachs.length,
  arbitres: arbitres.length,
  officiels: officiels.length,
  medecins: medecins.length,
}

// Helper pour obtenir les options de filtres
export function getFilterOptions<T extends Record<string, unknown>>(
  data: T[],
  key: keyof T | string
): { value: string; label: string }[] {
  const k = String(key)
  const uniqueValues = [...new Set(data.map((item) => String(item[k as keyof T])))]
  return uniqueValues.filter(Boolean).map((value) => ({ value, label: value }))
}
