import { UsersDataError, asSourceUnavailable } from "./errors"
import { assertNoAuthorizationOverlaps } from "./authorizations"
import {
  parseAuditLogEntry,
  parseAuthAttempt,
  parseUser,
  parseUserAuthorization,
  validateAuditLogHeaders,
  validateAuthAttemptHeaders,
  validateUserAuthorizationHeaders,
  validateUsersHeaders,
  normalizeEmail,
} from "./validation"
import {
  AUDIT_LOG_SHEET,
  AUTH_ATTEMPTS_SHEET,
  USERS_SHEET,
  USER_AUTHORIZATIONS_SHEET,
  type AuditLogEntry,
  type AuthAttempt,
  type SheetRow,
  type User,
  type UserAuthorization,
  type UsersSheetsAdapter,
} from "./types"

type Parser<T> = (row: SheetRow, rowNumber: number) => T
const appendQueues = new Map<string, Promise<void>>()

export class UsersRepository {
  private readonly adapter: UsersSheetsAdapter

  constructor(adapter: UsersSheetsAdapter) {
    this.adapter = adapter
  }

  private async readValidated<T>(
    sheetName: string,
    validateHeaders: (headers: string[]) => void,
    parse: Parser<T>
  ): Promise<T[]> {
    try {
      const rows = await this.adapter.readRows(sheetName, { fresh: true })
      const headers = await this.adapter.readHeaders(sheetName, { fresh: true })
      validateHeaders(headers)
      return rows.filter((row) => Object.values(row).some((value) => value.trim())).map((row, index) => parse(row, index + 2))
    } catch (error) {
      if (error instanceof UsersDataError) throw error
      throw asSourceUnavailable(error, `la lecture de ${sheetName}`)
    }
  }

  async getUsers(): Promise<User[]> {
    const users = await this.readValidated(USERS_SHEET, validateUsersHeaders, parseUser)
    const ids = new Set<string>()
    const emails = new Set<string>()
    for (const user of users) {
      if (ids.has(user.idUser)) throw new UsersDataError("CONFLICT", `USERS : id_user dupliqué (${user.idUser}).`)
      if (emails.has(user.email)) throw new UsersDataError("CONFLICT", "USERS : adresse e-mail normalisée dupliquée.")
      ids.add(user.idUser)
      emails.add(user.email)
    }
    return users
  }

  async getUserById(idUser: string): Promise<User | null> {
    return (await this.getUsers()).find((user) => user.idUser === idUser.trim()) ?? null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email)
    return (await this.getUsers()).find((user) => user.email === normalized) ?? null
  }

  async requireUserById(idUser: string): Promise<User> {
    const user = await this.getUserById(idUser)
    if (!user) throw new UsersDataError("NOT_FOUND", "Utilisateur introuvable.")
    return user
  }

  async getUserAuthorizations(): Promise<UserAuthorization[]> {
    const authorizations = await this.readValidated(
      USER_AUTHORIZATIONS_SHEET,
      validateUserAuthorizationHeaders,
      parseUserAuthorization
    )
    const ids = new Set<string>()
    for (const authorization of authorizations) {
      if (ids.has(authorization.idUserAutorisation)) {
        throw new UsersDataError("CONFLICT", `USER_AUTORISATIONS : identifiant dupliqué (${authorization.idUserAutorisation}).`)
      }
      ids.add(authorization.idUserAutorisation)
    }
    assertNoAuthorizationOverlaps(authorizations)
    return authorizations
  }

  async getAuthorizationsForUser(idUser: string): Promise<UserAuthorization[]> {
    return (await this.getUserAuthorizations()).filter((authorization) => authorization.idUser === idUser.trim())
  }

  async getAuthAttempts(): Promise<AuthAttempt[]> {
    return this.readValidated(AUTH_ATTEMPTS_SHEET, validateAuthAttemptHeaders, parseAuthAttempt)
  }

  async getAuditLog(): Promise<AuditLogEntry[]> {
    return this.readValidated(AUDIT_LOG_SHEET, validateAuditLogHeaders, parseAuditLogEntry)
  }

  private async appendIdempotent<T extends { requestId: string }>(params: {
    sheetName: string
    requestId: string
    read: () => Promise<T[]>
    row: SheetRow
  }): Promise<"CREATED" | "EXISTING"> {
    const key = `${params.sheetName}:${params.requestId}`, previous = appendQueues.get(key) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => { release = resolve })
    const queued = previous.then(() => current)
    appendQueues.set(key, queued)
    await previous
    try { return await this.appendIdempotentUnlocked(params) }
    finally { release(); if (appendQueues.get(key) === queued) appendQueues.delete(key) }
  }

  private async appendIdempotentUnlocked<T extends { requestId: string }>(params: {
    sheetName: string
    requestId: string
    read: () => Promise<T[]>
    row: SheetRow
  }): Promise<"CREATED" | "EXISTING"> {
    const existing = (await params.read()).find((item) => item.requestId === params.requestId)
    if (existing) return "EXISTING"
    try {
      await this.adapter.appendRow(params.sheetName, params.row)
    } catch (error) {
      throw asSourceUnavailable(error, `l'écriture de ${params.sheetName}`)
    }
    const confirmed = (await params.read()).filter((item) => item.requestId === params.requestId)
    if (confirmed.length !== 1) {
      throw new UsersDataError("WRITE_NOT_CONFIRMED", `${params.sheetName} : écriture non confirmée pour request_id.`)
    }
    return "CREATED"
  }

  async appendAuthAttempt(attempt: AuthAttempt): Promise<"CREATED" | "EXISTING"> {
    return this.appendIdempotent({
      sheetName: AUTH_ATTEMPTS_SHEET,
      requestId: attempt.requestId,
      read: () => this.getAuthAttempts(),
      row: {
        id_tentative: attempt.idTentative,
        identifiant_hash: attempt.identifiantHash,
        ip_hash: attempt.ipHash,
        date_tentative: attempt.dateTentative,
        resultat: attempt.resultat,
        request_id: attempt.requestId,
      },
    })
  }

  async appendAuditLog(entry: AuditLogEntry): Promise<"CREATED" | "EXISTING"> {
    return this.appendIdempotent({
      sheetName: AUDIT_LOG_SHEET,
      requestId: entry.requestId,
      read: () => this.getAuditLog(),
      row: {
        id_operation: entry.idOperation,
        id_user: entry.idUser ?? "",
        action: entry.action,
        type_objet: entry.typeObjet,
        id_objet: entry.idObjet ?? "",
        date_operation: entry.dateOperation,
        resultat: entry.resultat,
        request_id: entry.requestId,
        details_non_sensibles: entry.detailsNonSensibles,
      },
    })
  }
}
