export function clubLogoErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const missing = message.match(/Missing environment variable: ([A-Z0-9_]+)/)?.[1];
  if (missing) return `Configuration serveur incomplète : ${missing}.`;
  if (/invalid_grant|refresh_token doit être renouvelé/i.test(message))
    return "Autorisation Google Drive expirée. Le jeton doit être renouvelé.";
  if (/file not found|not found|insufficient permissions|permission/i.test(message))
    return "Le compte Google configuré n’a pas accès au dossier des logos.";
  if (/colonnes logo_drive_id|club google sheets introuvable/i.test(message))
    return message;
  return "Téléversement du logo impossible.";
}
