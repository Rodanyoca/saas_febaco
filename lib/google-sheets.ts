import { google } from "googleapis";

const SHEETS_REQUEST_TIMEOUT_MS = 10000;
const SHEETS_CACHE_TTL_MS = 5 * 60_000;
const readCache = new Map<string, { expiresAt: number; value: unknown[][] }>();
const pendingReads = new Map<string, Promise<unknown[][]>>();

export type SheetBlock =
  | "structure"
  | "referentiel"
  | "users"
  | "acteurs"
  | "affiliations"
  | "competitions"
  | "licences"
  | "equipeNationale"
  | "importExport";

const spreadsheetEnvByBlock: Record<SheetBlock, string> = {
  structure: "GOOGLE_SHEETS_STRUCTURE_ID",
  referentiel: "GOOGLE_SHEETS_REFERENTIEL_ID",
  users: "GOOGLE_SHEETS_USERS_ID",
  acteurs: "GOOGLE_SHEETS_ACTEURS_ID",
  affiliations: "GOOGLE_SHEETS_AFFILIATIONS_ID",
  competitions: "GOOGLE_SHEETS_COMPETITIONS_ID",
  licences: "GOOGLE_SHEETS_LICENCES_ID",
  equipeNationale: "GOOGLE_SHEETS_EQUIPE_NATIONALE_ID",
  importExport: "GOOGLE_SHEETS_IMPORT_EXPORT_ID",
};

const spreadsheetFallbackByBlock: Partial<Record<SheetBlock, string>> = {
  referentiel: "1hoW2S9NRzhhtBuXtkLnMqOSdhYyjKtDEVPHQr7pVQRg",
  competitions: "19pBbuaxnDlaCIjNQdJBce5NrNE6sxanqtLNBbWkrdY4",
  licences: "1Jy35NhhvprjLj2k_Exu90yzkSaNXvr-JFdUd9RbrGBY",
  equipeNationale: "1QF5TwdAUkj4wO6KZUu2aMKxmeQ4FzAFLyhX0iwIf8Ak",
};

const sheetBlockByName: Record<string, SheetBlock> = {
  provinces: "structure",
  ligues: "structure",
  ententes: "structure",
  clubs: "structure",
  equipes: "structure",
  athletes: "acteurs",
  coachs: "acteurs",
  medecins: "acteurs",
  arbitres: "acteurs",
  officiels: "acteurs",
  affiliations: "affiliations",
  competitions: "competitions",
  competitions_participants: "competitions",
  competitions_unites: "competitions",
  competitions_resultats: "competitions",
  competitions_classement: "competitions",
  athlete_licences: "licences",
  acteurs_licences: "licences",
  participants: "competitions",
  unites: "competitions",
  resultats: "competitions",
  classement: "competitions",
  selections: "equipeNationale",
  competitions_nationales: "equipeNationale",
  resultats_nationaux: "equipeNationale",
  users: "users",
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSpreadsheetId(block: SheetBlock): string {
  const envName = spreadsheetEnvByBlock[block];
  const value = process.env[envName] ?? spreadsheetFallbackByBlock[block];
  if (!value) {
    throw new Error(
      `Spreadsheet ID absent pour le bloc '${block}' (${envName}).`,
    );
  }
  return value;
}

function getPrivateKey(): string {
  const raw = requiredEnv("GOOGLE_PRIVATE_KEY");
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function normalizeHeader(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createSheetsClient() {
  const auth = new google.auth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

function createSheetsClientReadWrite() {
  const auth = new google.auth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function inferBlockFromSheetName(sheetName: string): SheetBlock {
  const normalized = normalizeHeader(sheetName);
  const block = sheetBlockByName[normalized];
  if (!block) {
    throw new Error(`Bloc métier introuvable pour la feuille '${sheetName}'.`);
  }
  return block;
}

function withGoogleSheetsErrorContext(
  error: unknown,
  block: SheetBlock,
  sheetName: string,
): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(
    `Lecture Google Sheets impossible pour '${block}/${sheetName}': ${message}`,
  );
}

export type SheetRow = Record<string, string>;

type ReadSheetParams = {
  block?: SheetBlock;
  sheet: string;
  range?: string;
  fresh?: boolean;
};

type ReadSheetRowsOptions = {
  block?: SheetBlock;
  range?: string;
};

const TERRITORIAL_SHEETS = new Set([
  "provinces",
  "ligues",
  "ententes",
  "clubs",
  "equipes",
]);

export function canonicalizeReadRange(
  block: SheetBlock,
  sheet: string,
  range: string,
): string {
  if (block === "referentiel" || block === "competitions") return "A:ZZ";
  return block === "structure" && TERRITORIAL_SHEETS.has(normalizeHeader(sheet)) ? "A:ZZ" : range;
}

function googleErrorStatus(error: unknown): number | undefined {
  const candidate = error as {
    code?: number;
    response?: { status?: number };
  };
  return candidate?.response?.status ?? candidate?.code;
}

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return googleErrorStatus(error) === 429 || /quota exceeded|rate limit/i.test(message);
}

export async function readSheet(params: ReadSheetParams): Promise<unknown[][]> {
  const block = params.block ?? inferBlockFromSheetName(params.sheet);
  const spreadsheetId = getSpreadsheetId(block);
  const range = canonicalizeReadRange(
    block,
    params.sheet,
    params.range ?? "A:ZZ",
  );
  const cacheKey = `${spreadsheetId}:${params.sheet.toLowerCase()}:${range}`;
  const cached = params.fresh ? undefined : readCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = pendingReads.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const sheets = createSheetsClient();
    const sheetNameVariants = Array.from(
      new Set([
        params.sheet,
        params.sheet.toUpperCase(),
        params.sheet.toLowerCase(),
      ]),
    );
    let lastError: unknown;

    for (const candidate of sheetNameVariants) {
      try {
        const res = await sheets.spreadsheets.values.get(
          {
            spreadsheetId,
            range: `${quoteSheetName(candidate)}!${range}`,
          },
          {
            timeout: SHEETS_REQUEST_TIMEOUT_MS,
          },
        );

        const values = res.data.values ?? [];
        if (readCache.size >= 100) {
          const now = Date.now();
          for (const [key, entry] of readCache)
            if (entry.expiresAt <= now) readCache.delete(key);
          if (readCache.size >= 100) readCache.clear();
        }
        readCache.set(cacheKey, {
          expiresAt: Date.now() + SHEETS_CACHE_TTL_MS,
          value: values,
        });
        return values;
      } catch (error) {
        lastError = error;
        if (isQuotaError(error) && cached) return cached.value;
        if (googleErrorStatus(error) !== 400) {
          throw withGoogleSheetsErrorContext(error, block, params.sheet);
        }
      }
    }

    throw withGoogleSheetsErrorContext(lastError, block, params.sheet);
  })();

  pendingReads.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pendingReads.delete(cacheKey);
  }
}

export async function readSheetRows(
  params: string | ReadSheetParams,
  options: ReadSheetRowsOptions = {},
): Promise<SheetRow[]> {
  const values = await readSheet(
    typeof params === "string"
      ? { sheet: params, block: options.block, range: options.range }
      : params,
  );

  if (values.length === 0) return [];

  const [headerRow, ...dataRows] = values;
  const headerOccurrences = new Map<string, number>();
  const headers = (headerRow ?? []).map((h) => {
    const header = normalizeHeader(String(h ?? ""));
    if (!header) return "";

    const occurrence = (headerOccurrences.get(header) ?? 0) + 1;
    headerOccurrences.set(header, occurrence);
    return occurrence === 1 ? header : `${header}_${occurrence}`;
  });

  return dataRows
    .filter((row) => row?.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const obj: SheetRow = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        if (!key) continue;
        obj[key] = String(row?.[i] ?? "").trim();
      }
      return obj;
    });
}

export function pickFirst(row: SheetRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "";
}

function columnIndexToA1(colIndexZeroBased: number): string {
  let n = colIndexZeroBased + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function clearSheetCache(spreadsheetId: string, sheetName: string) {
  const prefix = `${spreadsheetId}:${sheetName.toLowerCase()}:`;
  for (const key of readCache.keys())
    if (key.startsWith(prefix)) readCache.delete(key);
}

export async function writeSheetRowByHeaders({
  block,
  sheet,
  idHeader,
  id,
  values,
  mode,
}: {
  block: SheetBlock;
  sheet: string;
  idHeader: string;
  id: string;
  values: Record<string, string>;
  mode: "create" | "update";
}): Promise<SheetRow> {
  const spreadsheetId = getSpreadsheetId(block);
  const client = createSheetsClientReadWrite();
  const response = await client.spreadsheets.values.get(
    {
      spreadsheetId,
      range: `${quoteSheetName(sheet)}!A:ZZ`,
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  );
  const rows = response.data.values ?? [];
  if (!rows.length) throw new Error("SCHEMA_INDISPONIBLE");

  const headers = (rows[0] ?? []).map((value) =>
    normalizeHeader(String(value ?? "")),
  );
  const idColumn = headers.indexOf(normalizeHeader(idHeader));
  if (idColumn < 0) throw new Error("SCHEMA_INDISPONIBLE");
  for (const [key, value] of Object.entries(values)) {
    if (
      !headers.includes(normalizeHeader(key)) &&
      String(value ?? "").trim() !== ""
    ) {
      throw new Error(`SCHEMA_INDISPONIBLE:${normalizeHeader(key)}`);
    }
  }

  const existingIndex = rows
    .slice(1)
    .findIndex((row) => String(row?.[idColumn] ?? "").trim() === id);
  if (mode === "create" && existingIndex >= 0)
    throw new Error("IDENTIFIANT_DUPLIQUE");
  if (mode === "update" && existingIndex < 0) throw new Error("INTROUVABLE");

  const rowNumber = mode === "create" ? rows.length + 1 : existingIndex + 2;
  const previous = mode === "create" ? [] : (rows[rowNumber - 1] ?? []);
  const next = headers.map((header, index) => {
    if (header === normalizeHeader(idHeader)) return id;
    return Object.prototype.hasOwnProperty.call(values, header)
      ? values[header]
      : String(previous[index] ?? "");
  });

  await client.spreadsheets.values.update(
    {
      spreadsheetId,
      range: `${quoteSheetName(sheet)}!A${rowNumber}:${columnIndexToA1(headers.length - 1)}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [next] },
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  );
  clearSheetCache(spreadsheetId, sheet);

  return Object.fromEntries(
    headers.map((header, index) => [header, String(next[index] ?? "").trim()]),
  );
}

export async function appendSheetRowsAtomically({
  block,
  rows,
}: {
  block: SheetBlock;
  rows: Array<{ sheet: string; values: Record<string, string> }>;
}): Promise<void> {
  const spreadsheetId = getSpreadsheetId(block);
  const client = createSheetsClientReadWrite();
  const sheetNames = [...new Set(rows.map(({ sheet }) => sheet))];
  const schemaEntries = await Promise.all(
    sheetNames.map(async (sheet) => {
      const response = await client.spreadsheets.values.get(
        { spreadsheetId, range: `${quoteSheetName(sheet)}!A:ZZ` },
        { timeout: SHEETS_REQUEST_TIMEOUT_MS },
      );
      const existing = response.data.values ?? [];
      if (!existing.length) throw new Error(`SCHEMA_INDISPONIBLE:${sheet}`);
      const headers = (existing[0] ?? []).map((value) =>
        normalizeHeader(String(value ?? "")),
      );
      return [sheet, { headers, nextRow: existing.length + 1 }] as const;
    }),
  );
  const schemaBySheet = new Map(schemaEntries);
  const offsets = new Map<string, number>();
  const schemas = rows.map(({ sheet, values }) => {
    const schema = schemaBySheet.get(sheet)!;
    for (const [key, value] of Object.entries(values))
      if (!schema.headers.includes(normalizeHeader(key)) && value.trim())
        throw new Error(`SCHEMA_INDISPONIBLE:${sheet}:${key}`);
    const offset = offsets.get(sheet) ?? 0;
    offsets.set(sheet, offset + 1);
    const rowNumber = schema.nextRow + offset;
    return {
      sheet,
      range: `${quoteSheetName(sheet)}!A${rowNumber}:${columnIndexToA1(schema.headers.length - 1)}${rowNumber}`,
      values: [schema.headers.map((header) =>
        Object.prototype.hasOwnProperty.call(values, header) ? values[header] : "",
      )],
    };
  });
  await client.spreadsheets.values.batchUpdate(
    {
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: schemas.map(({ range, values }) => ({ range, values })),
      },
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  );
  for (const { sheet } of schemas) clearSheetCache(spreadsheetId, sheet);
}

export async function upsertSheetRowsAtomically({
  block,
  rows,
}: {
  block: SheetBlock;
  rows: Array<{ sheet: string; idHeader: string; values: Record<string, string> }>;
}): Promise<void> {
  const spreadsheetId = getSpreadsheetId(block);
  const client = createSheetsClientReadWrite();
  const sheetNames = [...new Set(rows.map((row) => row.sheet))];
  const entries = await Promise.all(sheetNames.map(async (sheet) => {
    const response = await client.spreadsheets.values.get(
      { spreadsheetId, range: `${quoteSheetName(sheet)}!A:ZZ` },
      { timeout: SHEETS_REQUEST_TIMEOUT_MS },
    );
    const existing = response.data.values ?? [];
    if (!existing.length) throw new Error(`SCHEMA_INDISPONIBLE:${sheet}`);
    return [sheet, {
      headers: (existing[0] ?? []).map((value) => normalizeHeader(String(value ?? ""))),
      existing,
      nextRow: existing.length + 1,
    }] as const;
  }));
  const bySheet = new Map(entries), offsets = new Map<string, number>();
  const data = rows.map(({ sheet, idHeader, values }) => {
    const schema = bySheet.get(sheet)!;
    const normalizedId = normalizeHeader(idHeader), idColumn = schema.headers.indexOf(normalizedId);
    if (idColumn < 0) throw new Error(`SCHEMA_INDISPONIBLE:${sheet}:${normalizedId}`);
    for (const [key, value] of Object.entries(values))
      if (!schema.headers.includes(normalizeHeader(key)) && value.trim())
        throw new Error(`SCHEMA_INDISPONIBLE:${sheet}:${key}`);
    const id = String(values[idHeader] ?? values[normalizedId] ?? "").trim();
    const existingIndex = schema.existing.slice(1).findIndex((row) => String(row?.[idColumn] ?? "").trim() === id);
    const offset = offsets.get(sheet) ?? 0;
    if (existingIndex < 0) offsets.set(sheet, offset + 1);
    const rowNumber = existingIndex >= 0 ? existingIndex + 2 : schema.nextRow + offset;
    const previous = existingIndex >= 0 ? schema.existing[existingIndex + 1] ?? [] : [];
    const line = schema.headers.map((header, index) => Object.prototype.hasOwnProperty.call(values, header) ? values[header] : String(previous[index] ?? ""));
    return { sheet, range: `${quoteSheetName(sheet)}!A${rowNumber}:${columnIndexToA1(schema.headers.length - 1)}${rowNumber}`, values: [line] };
  });
  await client.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: data.map(({ range, values }) => ({ range, values })) },
  }, { timeout: SHEETS_REQUEST_TIMEOUT_MS });
  for (const sheet of sheetNames) clearSheetCache(spreadsheetId, sheet);
}

export async function getAvatarTargetByEntityId({
  sheetName,
  entityId,
  entityIdHeaderCandidates,
  block = "acteurs",
}: {
  sheetName: string;
  entityId: string;
  entityIdHeaderCandidates: string[];
  block?: SheetBlock;
}): Promise<{ avatarDriveId: string; avatarDriveUrl: string }> {
  const spreadsheetId = getSpreadsheetId(block);
  const sheets = createSheetsClientReadWrite();
  const response = await sheets.spreadsheets.values.get(
    {
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!A:ZZ`,
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  );
  const values = response.data.values ?? [];
  if (values.length === 0)
    throw new Error(`Feuille '${sheetName}' vide ou introuvable`);

  const [headerRow, ...dataRows] = values;
  const headers = (headerRow ?? []).map((header) =>
    normalizeHeader(String(header ?? "")),
  );
  const candidates = entityIdHeaderCandidates.map(normalizeHeader);
  const entityIdColumn = headers.findIndex((header) =>
    candidates.includes(header),
  );
  const avatarIdColumn = headers.findIndex(
    (header) => header === "avatar_drive_id",
  );
  const avatarUrlColumn = headers.findIndex(
    (header) => header === "avatar_drive_url",
  );
  if (entityIdColumn < 0)
    throw new Error(`Colonne ID introuvable dans '${sheetName}'`);
  if (avatarIdColumn < 0 || avatarUrlColumn < 0)
    throw new Error(
      `Colonnes avatar_drive_id / avatar_drive_url introuvables dans '${sheetName}'`,
    );

  const row = dataRows.find(
    (candidate) =>
      String(candidate?.[entityIdColumn] ?? "").trim() === entityId.trim(),
  );
  if (!row) throw new Error("Ligne Google Sheets introuvable");
  return {
    avatarDriveId: String(row[avatarIdColumn] ?? "").trim(),
    avatarDriveUrl: String(row[avatarUrlColumn] ?? "").trim(),
  };
}

export async function updateAvatarFieldsByEntityId({
  sheetName,
  entityId,
  entityIdHeaderCandidates,
  avatarDriveId,
  avatarDriveUrl,
  block,
}: {
  sheetName: string;
  entityId: string;
  entityIdHeaderCandidates: string[];
  avatarDriveId: string;
  avatarDriveUrl: string;
  block?: SheetBlock;
}): Promise<{ rowNumber: number }> {
  const resolvedBlock = block ?? inferBlockFromSheetName(sheetName);
  const spreadsheetId = getSpreadsheetId(resolvedBlock);
  const sheets = createSheetsClientReadWrite();

  const res = await sheets.spreadsheets.values.get(
    {
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    },
    {
      timeout: SHEETS_REQUEST_TIMEOUT_MS,
    },
  );

  const values = res.data.values ?? [];
  if (values.length === 0) {
    throw new Error(`Feuille '${sheetName}' vide ou introuvable`);
  }

  const [headerRow, ...dataRows] = values;
  const headers = (headerRow ?? []).map((h) =>
    normalizeHeader(String(h ?? "")),
  );

  const idHeadersNormalized = entityIdHeaderCandidates.map((h) =>
    normalizeHeader(h),
  );
  const idColIndex = headers.findIndex((h) => idHeadersNormalized.includes(h));
  if (idColIndex < 0) {
    throw new Error(`Colonne ID introuvable dans '${sheetName}'`);
  }

  const avatarIdColIndex = headers.findIndex((h) => h === "avatar_drive_id");
  const avatarUrlColIndex = headers.findIndex((h) => h === "avatar_drive_url");
  if (avatarIdColIndex < 0 || avatarUrlColIndex < 0) {
    throw new Error(
      `Colonnes avatar_drive_id / avatar_drive_url introuvables dans '${sheetName}'`,
    );
  }

  const targetRowIndex = dataRows.findIndex(
    (row) => String(row?.[idColIndex] ?? "").trim() === String(entityId).trim(),
  );
  if (targetRowIndex < 0) {
    throw new Error("Ligne Google Sheets introuvable");
  }

  const rowNumber = targetRowIndex + 2;
  const avatarIdA1 = `${sheetName}!${columnIndexToA1(avatarIdColIndex)}${rowNumber}`;
  const avatarUrlA1 = `${sheetName}!${columnIndexToA1(avatarUrlColIndex)}${rowNumber}`;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: avatarIdA1,
          values: [[avatarDriveId]],
        },
        {
          range: avatarUrlA1,
          values: [[avatarDriveUrl]],
        },
      ],
    },
  });

  const sheetCachePrefix = `${spreadsheetId}:${sheetName.toLowerCase()}:`;
  for (const key of readCache.keys()) {
    if (key.startsWith(sheetCachePrefix)) readCache.delete(key);
  }

  return { rowNumber };
}

export async function getClubLogoTarget(
  clubId: string,
): Promise<{ logoDriveId: string; logoDriveUrl: string }> {
  const spreadsheetId = getSpreadsheetId("structure");
  const sheets = createSheetsClientReadWrite();
  const response = await sheets.spreadsheets.values.get(
    { spreadsheetId, range: `${quoteSheetName("CLUBS")}!A:ZZ` },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  );
  const [headerRow, ...rows] = response.data.values ?? [];
  const headers = (headerRow ?? []).map((value) =>
    normalizeHeader(String(value ?? "")),
  );
  const idColumn = headers.indexOf("id_club"),
    logoIdColumn = headers.indexOf("logo_drive_id"),
    logoUrlColumn = headers.indexOf("logo_drive_url");
  if (idColumn < 0 || logoIdColumn < 0 || logoUrlColumn < 0)
    throw new Error(
      "Colonnes logo_drive_id / logo_drive_url introuvables dans 'CLUBS'",
    );
  const row = rows.find(
    (candidate) => String(candidate?.[idColumn] ?? "").trim() === clubId.trim(),
  );
  if (!row) throw new Error("Club Google Sheets introuvable");
  return {
    logoDriveId: String(row[logoIdColumn] ?? "").trim(),
    logoDriveUrl: String(row[logoUrlColumn] ?? "").trim(),
  };
}

export async function updateClubLogoFields(
  clubId: string,
  logoDriveId: string,
  logoDriveUrl: string,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId("structure");
  const sheets = createSheetsClientReadWrite();
  const response = await sheets.spreadsheets.values.get(
    { spreadsheetId, range: `${quoteSheetName("CLUBS")}!A:ZZ` },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  );
  const [headerRow, ...rows] = response.data.values ?? [];
  const headers = (headerRow ?? []).map((value) =>
    normalizeHeader(String(value ?? "")),
  );
  const idColumn = headers.indexOf("id_club"),
    logoIdColumn = headers.indexOf("logo_drive_id"),
    logoUrlColumn = headers.indexOf("logo_drive_url");
  const rowIndex = rows.findIndex(
    (candidate) => String(candidate?.[idColumn] ?? "").trim() === clubId.trim(),
  );
  if (idColumn < 0 || logoIdColumn < 0 || logoUrlColumn < 0)
    throw new Error(
      "Colonnes logo_drive_id / logo_drive_url introuvables dans 'CLUBS'",
    );
  if (rowIndex < 0) throw new Error("Club Google Sheets introuvable");
  const rowNumber = rowIndex + 2;
  await sheets.spreadsheets.values.batchUpdate(
    {
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          {
            range: `${quoteSheetName("CLUBS")}!${columnIndexToA1(logoIdColumn)}${rowNumber}`,
            values: [[logoDriveId]],
          },
          {
            range: `${quoteSheetName("CLUBS")}!${columnIndexToA1(logoUrlColumn)}${rowNumber}`,
            values: [[logoDriveUrl]],
          },
        ],
      },
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  );
  clearSheetCache(spreadsheetId, "CLUBS");
}
