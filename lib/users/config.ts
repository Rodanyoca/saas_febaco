export function getUsersSpreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_USERS_ID?.trim()
  if (!id) throw new Error("GOOGLE_SHEETS_USERS_ID absent.")
  return id
}
