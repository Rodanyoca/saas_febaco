import { UsersDataError } from "../users/errors"
import { PasswordPolicyError } from "./password-policy"
export function authenticationWorkflowFailure(error: unknown, fallback: string) {
  if (error instanceof UsersDataError) return { status: 503, message: "Le service de compte est momentanément indisponible. Réessayez." }
  if (error instanceof PasswordPolicyError) return { status: 400, message: error.message }
  return { status: 400, message: fallback }
}
