import { google } from "googleapis";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function privateKey(): string { return requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"); }

let sheetsReadClient: ReturnType<typeof google.sheets> | undefined;
let sheetsWriteClient: ReturnType<typeof google.sheets> | undefined;
let driveServiceClient: ReturnType<typeof google.drive> | undefined;
let driveUserClient: ReturnType<typeof google.drive> | undefined;

export function getSheetsReadClient() {
  if (!sheetsReadClient) {
    const auth = new google.auth.JWT({ email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"), key: privateKey(), scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
    sheetsReadClient = google.sheets({ version: "v4", auth });
  }
  return sheetsReadClient;
}

export function getSheetsWriteClient() {
  if (!sheetsWriteClient) {
    const auth = new google.auth.JWT({ email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"), key: privateKey(), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    sheetsWriteClient = google.sheets({ version: "v4", auth });
  }
  return sheetsWriteClient;
}

export function getDriveServiceClient() {
  if (!driveServiceClient) {
    const auth = new google.auth.JWT({ email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"), key: privateKey(), scopes: ["https://www.googleapis.com/auth/drive"] });
    driveServiceClient = google.drive({ version: "v3", auth });
  }
  return driveServiceClient;
}

export function getDriveUserClient() {
  if (!driveUserClient) {
    const auth = new google.auth.OAuth2({ clientId: requiredEnv("GOOGLE_OAUTH_CLIENT_ID"), clientSecret: requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET") });
    auth.setCredentials({ refresh_token: requiredEnv("GOOGLE_DRIVE_REFRESH_TOKEN") });
    driveUserClient = google.drive({ version: "v3", auth });
  }
  return driveUserClient;
}

