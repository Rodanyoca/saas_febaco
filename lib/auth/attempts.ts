import { randomUUID } from "node:crypto"
import { UsersRepository } from "../users/repository"
import type { AuthAttempt, AuthAttemptResult, UsersSheetsAdapter } from "../users/types"

export const ATTEMPT_WINDOW_MS = 30 * 60 * 1000
export const TEMPORARY_BLOCK_MS = 30 * 60 * 1000

export function attemptState(attempts: AuthAttempt[], identifiantHash: string, _ipHash: string, now: Date) {
  const relevant = attempts.filter((item) => item.identifiantHash === identifiantHash && Date.parse(item.dateTentative) <= now.getTime()).sort((a, b) => Date.parse(a.dateTentative) - Date.parse(b.dateTentative))
  const lastSuccess = relevant.findLastIndex((item) => item.resultat === "SUCCES")
  const series = relevant.slice(lastSuccess + 1).filter((item) => item.resultat === "ECHEC")
  const windowFailures = series.filter((item) => now.getTime() - Date.parse(item.dateTentative) <= ATTEMPT_WINDOW_MS)
  const tenth = windowFailures.length >= 10 ? windowFailures[9] : null
  const blockedUntil = tenth ? new Date(Date.parse(tenth.dateTentative) + TEMPORARY_BLOCK_MS) : null
  return { failures: windowFailures.length, blockedUntil, blocked: Boolean(blockedUntil && blockedUntil.getTime() > now.getTime()), delayMs: progressiveDelay(windowFailures.length) }
}

export function progressiveDelay(failures: number) { return failures < 5 ? 0 : Math.min(2_000, 250 * (2 ** (failures - 5))) }
export async function waitForDelay(milliseconds: number) { if (milliseconds > 0) await new Promise((resolve) => setTimeout(resolve, milliseconds)) }

export async function recordAttempt(input: { adapter: UsersSheetsAdapter; identifiantHash: string; ipHash: string; result: AuthAttemptResult; requestId: string; now: Date }) {
  return new UsersRepository(input.adapter).appendAuthAttempt({ idTentative: `ATT-${randomUUID()}`, identifiantHash: input.identifiantHash, ipHash: input.ipHash, dateTentative: input.now.toISOString(), resultat: input.result, requestId: input.requestId })
}
