import { randomInt } from "node:crypto"

const TEMPORARY_ACCESS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
export const TEMPORARY_ACCESS_LENGTH = 20
export const TEMPORARY_ACCESS_TTL_MS = 24 * 60 * 60 * 1000

export function generateTemporaryAccess(randomIndex: (max: number) => number = randomInt): string {
  let result = ""
  for (let index = 0; index < TEMPORARY_ACCESS_LENGTH; index += 1) {
    result += TEMPORARY_ACCESS_ALPHABET[randomIndex(TEMPORARY_ACCESS_ALPHABET.length)]
  }
  return result
}

export function temporaryAccessExpiration(createdAt: Date): string {
  return new Date(createdAt.getTime() + TEMPORARY_ACCESS_TTL_MS).toISOString()
}
