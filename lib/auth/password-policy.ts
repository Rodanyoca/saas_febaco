export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

const COMMON_PASSWORDS = new Set([
  "123456789012",
  "adminadminadmin",
  "administrator",
  "azertyazerty",
  "changemechangeme",
  "motdepasse",
  "password1234",
  "passwordpassword",
  "qwertyqwerty",
])

export type PasswordPolicyCode = "TOO_SHORT" | "TOO_LONG" | "COMMON_OR_COMPROMISED"

export class PasswordPolicyError extends Error {
  readonly code: PasswordPolicyCode

  constructor(code: PasswordPolicyCode, message: string) {
    super(message)
    this.name = "PasswordPolicyError"
    this.code = code
  }
}

export function passwordLength(password: string): number {
  return Array.from(password).length
}

export function assertPasswordPolicy(password: string): void {
  const length = passwordLength(password)
  if (length < PASSWORD_MIN_LENGTH) {
    throw new PasswordPolicyError("TOO_SHORT", `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  }
  if (length > PASSWORD_MAX_LENGTH) {
    throw new PasswordPolicyError("TOO_LONG", `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`)
  }
  if (COMMON_PASSWORDS.has(password.trim().toLowerCase())) {
    throw new PasswordPolicyError("COMMON_OR_COMPROMISED", "Ce mot de passe est trop courant ou compromis.")
  }
}
