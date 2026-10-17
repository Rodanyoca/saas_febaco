import { UsersDataError } from "./errors"
import { isSupportedPasswordHash } from "../auth/password"
import {
  AUDIT_LOG_HEADERS,
  AUDIT_RESULTS,
  AUTH_ATTEMPT_HEADERS,
  AUTH_ATTEMPT_RESULTS,
  AUTHORIZATION_BLOCKS,
  AUTHORIZATION_STATUSES,
  USER_AUTHORIZATION_HEADERS,
  USER_HEADERS,
  USER_STATUSES,
  USER_TYPES,
  type AuditLogEntry,
  type AuthAttempt,
  type SheetRow,
  type User,
  type UserAuthorization,
} from "./types"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

function invalid(sheet: string, rowNumber: number, field: string, reason: string): never {
  throw new UsersDataError("ROW_INVALID", `${sheet} ligne ${rowNumber}, colonne ${field} : ${reason}.`)
}

function required(row: SheetRow, field: string, sheet: string, rowNumber: number): string {
  const value = String(row[field] ?? "").trim()
  if (!value) invalid(sheet, rowNumber, field, "valeur obligatoire")
  return value
}

function optional(row: SheetRow, field: string): string | null {
  const value = String(row[field] ?? "").trim()
  return value || null
}

function oneOf<const T extends readonly string[]>(
  value: string,
  allowed: T,
  sheet: string,
  rowNumber: number,
  field: string
): T[number] {
  if (!allowed.includes(value)) invalid(sheet, rowNumber, field, `valeur non autorisée (${value})`)
  return value as T[number]
}

function booleanValue(value: string, sheet: string, rowNumber: number, field: string): boolean {
  if (value === "TRUE") return true
  if (value === "FALSE") return false
  return invalid(sheet, rowNumber, field, "booléen attendu (TRUE ou FALSE)")
}

function dateValue(value: string, sheet: string, rowNumber: number, field: string): string {
  if (!DATE_PATTERN.test(value)) invalid(sheet, rowNumber, field, "date attendue au format YYYY-MM-DD")
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    invalid(sheet, rowNumber, field, "date calendrier invalide")
  }
  return value
}

function optionalDate(value: string | null, sheet: string, rowNumber: number, field: string): string | null {
  return value ? dateValue(value, sheet, rowNumber, field) : null
}

function instantValue(value: string, sheet: string, rowNumber: number, field: string): string {
  if (!ISO_INSTANT_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    invalid(sheet, rowNumber, field, "instant ISO 8601 avec fuseau attendu")
  }
  return value
}

function optionalInstant(value: string | null, sheet: string, rowNumber: number, field: string): string | null {
  return value ? instantValue(value, sheet, rowNumber, field) : null
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function assertExactHeaders(sheet: string, actual: string[], expected: readonly string[]): void {
  const normalized = actual.map((header) => header.trim()).filter(Boolean)
  if (normalized.length !== expected.length || new Set(normalized).size !== normalized.length || normalized.some((header) => !expected.includes(header))) {
    throw new UsersDataError(
      "SCHEMA_INVALID",
      `${sheet} : en-têtes invalides. Attendus : ${expected.join(", ")}.`
    )
  }
}

export function parseUser(row: SheetRow, rowNumber: number): User {
  if (!isSupportedPasswordHash(row.password_hash || "")) invalid("USERS", rowNumber, "password_hash", "format scrypt non reconnu ; migration ou réinitialisation requise")
  const email = normalizeEmail(required(row, "email", "USERS", rowNumber))
  if (!/^\S+@\S+\.\S+$/.test(email)) invalid("USERS", rowNumber, "email", "adresse invalide")
  const sessionVersionRaw = required(row, "session_version", "USERS", rowNumber)
  const sessionVersion = Number(sessionVersionRaw)
  if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 1) {
    invalid("USERS", rowNumber, "session_version", "entier positif attendu")
  }

  return {
    idUser: required(row, "id_user", "USERS", rowNumber),
    idLigue: row.id_ligue?.trim() || "",
    idEntente: row.id_entente?.trim() || "",
    nomComplet: required(row, "nom_complet", "USERS", rowNumber),
    email,
    passwordHash: required(row, "password_hash", "USERS", rowNumber),
    typeUser: oneOf(required(row, "type_user", "USERS", rowNumber), USER_TYPES, "USERS", rowNumber, "type_user"),
    estSuperAdmin: booleanValue(required(row, "est_super_admin", "USERS", rowNumber), "USERS", rowNumber, "est_super_admin"),
    doitChangerMotDePasse: booleanValue(required(row, "doit_changer_mot_de_passe", "USERS", rowNumber), "USERS", rowNumber, "doit_changer_mot_de_passe"),
    statut: oneOf(required(row, "statut", "USERS", rowNumber), USER_STATUSES, "USERS", rowNumber, "statut"),
    dateCreation: instantValue(required(row, "date_creation", "USERS", rowNumber), "USERS", rowNumber, "date_creation"),
    dateModificationMotDePasse: optionalInstant(optional(row, "date_modification_mot_de_passe"), "USERS", rowNumber, "date_modification_mot_de_passe"),
    derniereConnexion: optionalInstant(optional(row, "derniere_connexion"), "USERS", rowNumber, "derniere_connexion"),
    sessionVersion,
    dateExpirationAccesTemporaire: optionalInstant(optional(row, "date_expiration_acces_temporaire"), "USERS", rowNumber, "date_expiration_acces_temporaire"),
  }
}

export function parseUserAuthorization(row: SheetRow, rowNumber: number): UserAuthorization {
  const dateDebut = dateValue(required(row, "date_debut", "USER_AUTORISATIONS", rowNumber), "USER_AUTORISATIONS", rowNumber, "date_debut")
  const dateFin = optionalDate(optional(row, "date_fin"), "USER_AUTORISATIONS", rowNumber, "date_fin")
  if (dateFin && dateFin < dateDebut) invalid("USER_AUTORISATIONS", rowNumber, "date_fin", "antérieure à date_debut")
  return {
    idUserAutorisation: required(row, "id_user_autorisation", "USER_AUTORISATIONS", rowNumber),
    idUser: required(row, "id_user", "USER_AUTORISATIONS", rowNumber),
    idBlocAutorisation: oneOf(required(row, "id_bloc_autorisation", "USER_AUTORISATIONS", rowNumber), AUTHORIZATION_BLOCKS, "USER_AUTORISATIONS", rowNumber, "id_bloc_autorisation"),
    statut: oneOf(required(row, "statut", "USER_AUTORISATIONS", rowNumber), AUTHORIZATION_STATUSES, "USER_AUTORISATIONS", rowNumber, "statut"),
    dateDebut,
    dateFin,
  }
}

export function parseAuthAttempt(row: SheetRow, rowNumber: number): AuthAttempt {
  return {
    idTentative: required(row, "id_tentative", "AUTH_TENTATIVES", rowNumber),
    identifiantHash: required(row, "identifiant_hash", "AUTH_TENTATIVES", rowNumber),
    ipHash: required(row, "ip_hash", "AUTH_TENTATIVES", rowNumber),
    dateTentative: instantValue(required(row, "date_tentative", "AUTH_TENTATIVES", rowNumber), "AUTH_TENTATIVES", rowNumber, "date_tentative"),
    resultat: oneOf(required(row, "resultat", "AUTH_TENTATIVES", rowNumber), AUTH_ATTEMPT_RESULTS, "AUTH_TENTATIVES", rowNumber, "resultat"),
    requestId: required(row, "request_id", "AUTH_TENTATIVES", rowNumber),
  }
}

export function parseAuditLogEntry(row: SheetRow, rowNumber: number): AuditLogEntry {
  return {
    idOperation: required(row, "id_operation", "JOURNAL_OPERATIONS", rowNumber),
    idUser: optional(row, "id_user"),
    action: required(row, "action", "JOURNAL_OPERATIONS", rowNumber),
    typeObjet: required(row, "type_objet", "JOURNAL_OPERATIONS", rowNumber),
    idObjet: optional(row, "id_objet"),
    dateOperation: instantValue(required(row, "date_operation", "JOURNAL_OPERATIONS", rowNumber), "JOURNAL_OPERATIONS", rowNumber, "date_operation"),
    resultat: oneOf(required(row, "resultat", "JOURNAL_OPERATIONS", rowNumber), AUDIT_RESULTS, "JOURNAL_OPERATIONS", rowNumber, "resultat"),
    requestId: required(row, "request_id", "JOURNAL_OPERATIONS", rowNumber),
    detailsNonSensibles: String(row.details_non_sensibles ?? "").trim(),
  }
}

export function validateUsersHeaders(headers: string[]): void {
  assertExactHeaders("USERS", headers, USER_HEADERS)
}
export function validateUserAuthorizationHeaders(headers: string[]): void {
  assertExactHeaders("USER_AUTORISATIONS", headers, USER_AUTHORIZATION_HEADERS)
}
export function validateAuthAttemptHeaders(headers: string[]): void {
  assertExactHeaders("AUTH_TENTATIVES", headers, AUTH_ATTEMPT_HEADERS)
}
export function validateAuditLogHeaders(headers: string[]): void {
  assertExactHeaders("JOURNAL_OPERATIONS", headers, AUDIT_LOG_HEADERS)
}
