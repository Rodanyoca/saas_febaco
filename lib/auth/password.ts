import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

import { assertPasswordPolicy } from "./password-policy"

const VERSION = "v1"
const COST = 65_536
const BLOCK_SIZE = 8
const PARALLELIZATION = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16
const MAX_MEMORY = 128 * 1024 * 1024
const PREFIX = `scrypt$${VERSION}$N=${COST},r=${BLOCK_SIZE},p=${PARALLELIZATION},l=${KEY_LENGTH}`

export class PasswordHashError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PasswordHashError"
  }
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, {
      N: COST,
      r: BLOCK_SIZE,
      p: PARALLELIZATION,
      maxmem: MAX_MEMORY,
    }, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

function encode(value: Buffer): string {
  return value.toString("base64url")
}

function decode(value: string, expectedLength: number, label: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new PasswordHashError(`${label} invalide.`)
  const decoded = Buffer.from(value, "base64url")
  if (decoded.length !== expectedLength || encode(decoded) !== value) {
    throw new PasswordHashError(`${label} invalide.`)
  }
  return decoded
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password)
  const salt = randomBytes(SALT_LENGTH)
  const derivedKey = await deriveKey(password, salt)
  return `${PREFIX}$${encode(salt)}$${encode(derivedKey)}`
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split("$")
  if (parts.length !== 5 || `${parts[0]}$${parts[1]}$${parts[2]}` !== PREFIX) {
    throw new PasswordHashError("Format ou paramètres scrypt non reconnus.")
  }
  const salt = decode(parts[3], SALT_LENGTH, "Sel scrypt")
  const expected = decode(parts[4], KEY_LENGTH, "Empreinte scrypt")
  const actual = await deriveKey(password, salt)
  return timingSafeEqual(actual, expected)
}

export function isSupportedPasswordHash(value: string): boolean {
  try {
    const parts=value.split("$")
    if(parts.length!==5 || `${parts[0]}$${parts[1]}$${parts[2]}`!==PREFIX)return false
    decode(parts[3],SALT_LENGTH,"Sel");decode(parts[4],KEY_LENGTH,"Empreinte")
    return true
  } catch { return false }
}

export const SCRYPT_PARAMETERS = Object.freeze({
  version: VERSION,
  N: COST,
  r: BLOCK_SIZE,
  p: PARALLELIZATION,
  keyLength: KEY_LENGTH,
  saltLength: SALT_LENGTH,
  maxMemory: MAX_MEMORY,
})
