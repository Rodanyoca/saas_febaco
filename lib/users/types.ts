export const USER_TYPES = ["ADMIN", "VIEWER"] as const
export const USER_STATUSES = ["ACTIF", "INACTIF", "BLOQUE"] as const
export const AUTHORIZATION_STATUSES = ["ACTIF", "INACTIF"] as const
export const AUTHORIZATION_BLOCKS = ["AUT-ADM", "AUT-SPT", "AUT-COM"] as const
export const AUTH_ATTEMPT_RESULTS = ["ECHEC", "SUCCES", "REFUS_BLOCAGE_TEMPORAIRE"] as const
export const AUDIT_RESULTS = ["SUCCES", "ECHEC"] as const

export const USERS_SHEET = "USERS"
export const USER_AUTHORIZATIONS_SHEET = "USER_AUTORISATIONS"
export const AUTH_ATTEMPTS_SHEET = "AUTH_TENTATIVES"
export const AUDIT_LOG_SHEET = "JOURNAL_OPERATIONS"

export const USER_HEADERS = [
  "id_user",
  "nom_complet",
  "email",
  "password_hash",
  "type_user",
  "est_super_admin",
  "doit_changer_mot_de_passe",
  "statut",
  "date_creation",
  "date_modification_mot_de_passe",
  "derniere_connexion",
  "session_version",
  "date_expiration_acces_temporaire",
  "id_ligue", "id_entente", "password", "role",
] as const

export const USER_AUTHORIZATION_HEADERS = [
  "id_user_autorisation",
  "id_user",
  "id_bloc_autorisation",
  "statut",
  "date_debut",
  "date_fin",
] as const

export const AUTH_ATTEMPT_HEADERS = [
  "id_tentative",
  "identifiant_hash",
  "ip_hash",
  "date_tentative",
  "resultat",
  "request_id",
] as const

export const AUDIT_LOG_HEADERS = [
  "id_operation",
  "id_user",
  "action",
  "type_objet",
  "id_objet",
  "date_operation",
  "resultat",
  "request_id",
  "details_non_sensibles",
] as const

export type UserType = (typeof USER_TYPES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number]
export type AuthorizationBlock = (typeof AUTHORIZATION_BLOCKS)[number]
export type AuthAttemptResult = (typeof AUTH_ATTEMPT_RESULTS)[number]
export type AuditResult = (typeof AUDIT_RESULTS)[number]
export type SheetRow = Record<string, string>

export interface User {
  idUser: string
  nomComplet: string
  email: string
  idLigue?: string
  idEntente?: string
  passwordHash: string
  typeUser: UserType
  estSuperAdmin: boolean
  doitChangerMotDePasse: boolean
  statut: UserStatus
  dateCreation: string
  dateModificationMotDePasse: string | null
  derniereConnexion: string | null
  sessionVersion: number
  dateExpirationAccesTemporaire: string | null
}

export interface UserAuthorization {
  idUserAutorisation: string
  idUser: string
  idBlocAutorisation: AuthorizationBlock
  statut: AuthorizationStatus
  dateDebut: string
  dateFin: string | null
}

export interface AuthAttempt {
  idTentative: string
  identifiantHash: string
  ipHash: string
  dateTentative: string
  resultat: AuthAttemptResult
  requestId: string
}

export interface AuditLogEntry {
  idOperation: string
  idUser: string | null
  action: string
  typeObjet: string
  idObjet: string | null
  dateOperation: string
  resultat: AuditResult
  requestId: string
  detailsNonSensibles: string
}

export interface UsersSheetsAdapter {
  readHeaders(sheetName: string, options: { fresh: true }): Promise<string[]>
  readRows(sheetName: string, options: { fresh: true }): Promise<SheetRow[]>
  appendRow(sheetName: string, row: SheetRow): Promise<void>
  updateRow?(sheetName: string, idColumn: string, idValue: string, row: SheetRow): Promise<void>
  deleteRow?(sheetName: string, idColumn: string, idValue: string): Promise<void>
}
