export type UsersDataErrorCode =
  | "SOURCE_UNAVAILABLE"
  | "SCHEMA_INVALID"
  | "ROW_INVALID"
  | "NOT_FOUND"
  | "CONFLICT"
  | "WRITE_NOT_CONFIRMED"

export class UsersDataError extends Error {
  readonly code: UsersDataErrorCode

  constructor(
    code: UsersDataErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "UsersDataError"
    this.code = code
  }
}

export function asSourceUnavailable(error: unknown, operation: string): UsersDataError {
  if (error instanceof UsersDataError) return error
  return new UsersDataError(
    "SOURCE_UNAVAILABLE",
    `La source Google Sheets est indisponible pendant ${operation}.`,
    { cause: error }
  )
}
