export interface Ligue {
  id: string
  nom: string
  pseudo: string
  province: string
  statut: string
}

export interface Entente {
  id: string
  nom: string
  pseudo: string
  ligue: string
  province: string
  statut: string
}

export interface Club {
  id: string
  nom: string
  categorie?: string
  dateAffiliation?: string
  avatarUrl?: string
  province: string
  ligue: string
  entente: string
  nombreEquipes: number
  statut: string
}

export interface Equipe {
  __key?: string
  id: string
  nom: string
  club: string
  entente: string
  ligue: string
  province: string
  categorie: string
  genre: string
  coach: string
  statut: string
}

export interface Athlete {
  __key?: string
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  avatarUrl?: string
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
  __key?: string
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
  __key?: string
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  avatarUrl?: string
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
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  avatarUrl?: string
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

export interface Medecin {
  __key?: string
  id: string
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  nationalite: string
  avatarUrl?: string
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

export function getFilterOptions<T extends Record<string, unknown>>(
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
