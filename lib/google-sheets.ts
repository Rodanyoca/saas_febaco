import { getSheetsReadClient, getSheetsWriteClient } from "@/lib/google-clients";
import { executeGoogleRequest, getGoogleRequestConfig, GoogleRequestError } from "@/lib/google-request";

const SHEETS_REQUEST_TIMEOUT_MS = getGoogleRequestConfig().timeoutMs;
const readCache = new Map<string, { expiresAt: number; value: unknown[][] }>();
const pendingReads = new Map<string, Promise<unknown[][]>>();
const pendingBatchReads = new Map<string, Promise<Record<string, unknown[][]>>>();
const sheetCacheMetrics = { hits: 0, misses: 0, coalesced: 0, staleFallbacks: 0 };
type QueuedRead = { block: SheetBlock; spreadsheetId: string; sheet: string; range: string; cacheKey: string; stale?: unknown[][]; resolve: (value: unknown[][]) => void; reject: (reason: unknown) => void };
const queuedReads = new Map<string, QueuedRead[]>();

export type SheetBlock =
  | "structure"
  | "referentiel"
  | "users"
  | "acteurs"
  | "affiliations"
  | "competitions"
  | "licences"
  | "equipeNationale";

const spreadsheetEnvByBlock: Record<SheetBlock, string> = {
  structure: "GOOGLE_SHEETS_STRUCTURE_ID",
  referentiel: "GOOGLE_SHEETS_REFERENTIEL_ID",
  users: "GOOGLE_SHEETS_USERS_ID",
  acteurs: "GOOGLE_SHEETS_ACTEURS_ID",
  affiliations: "GOOGLE_SHEETS_AFFILIATIONS_ID",
  competitions: "GOOGLE_SHEETS_COMPETITIONS_ID",
  licences: "GOOGLE_SHEETS_LICENCES_ID",
  equipeNationale: "GOOGLE_SHEETS_EQUIPE_NATIONALE_ID",
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

function normalizeHeader(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
  if (error instanceof GoogleRequestError) {
    return new GoogleRequestError(error.code, `Lecture Google Sheets impossible pour '${block}/${sheetName}': ${error.message}`, error.status, error.retryable, error.cause);
  }
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
    status?: number;
    response?: { status?: number };
  };
  return candidate?.response?.status ?? candidate?.status ?? candidate?.code;
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof GoogleRequestError) return error.code === "QUOTA_EXCEEDED";
  const message = error instanceof Error ? error.message : String(error);
  return googleErrorStatus(error) === 429 || /quota exceeded|rate limit/i.test(message);
}

function cacheTtl(block: SheetBlock): number {
  const env = block === "referentiel" ? "GOOGLE_REFERENTIAL_CACHE_TTL_MS" : "GOOGLE_OPERATIONAL_CACHE_TTL_MS";
  const fallback = block === "referentiel" ? 15 * 60_000 : 2 * 60_000;
  const value = Number(process.env[env]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sheetRequest<T>(block: SheetBlock, sheet: string, operation: string, access: "read" | "write", run: () => Promise<T>, idempotent = access === "read") {
  return executeGoogleRequest({ provider: "sheets", module: block, operation, access, idempotent, run });
}

function storeReadCache(key: string, block: SheetBlock, value: unknown[][]) {
  if (readCache.size >= 100) {
    const now = Date.now();
    for (const [cacheKey, entry] of readCache) if (entry.expiresAt <= now) readCache.delete(cacheKey);
    if (readCache.size >= 100) readCache.clear();
  }
  readCache.set(key, { expiresAt: Date.now() + cacheTtl(block), value });
}

async function flushQueuedReads(groupKey: string) {
  const entries = queuedReads.get(groupKey) ?? [];
  queuedReads.delete(groupKey);
  if (!entries.length) return;
  const first = entries[0];
  try {
    const response = await sheetRequest(first.block, entries.map((entry) => entry.sheet).join(","), "values.batchGet", "read", () => getSheetsReadClient().spreadsheets.values.batchGet({
      spreadsheetId: first.spreadsheetId,
      ranges: entries.map((entry) => `${quoteSheetName(entry.sheet)}!${entry.range}`),
    }, { timeout: SHEETS_REQUEST_TIMEOUT_MS }));
    entries.forEach((entry, index) => {
      const values = response.data.valueRanges?.[index]?.values ?? [];
      storeReadCache(entry.cacheKey, entry.block, values);
      entry.resolve(values);
    });
  } catch (error) {
    entries.forEach((entry) => {
      if (isQuotaError(error) && entry.stale) { sheetCacheMetrics.staleFallbacks += 1; entry.resolve(entry.stale); }
      else entry.reject(withGoogleSheetsErrorContext(error, entry.block, entry.sheet));
    });
  }
}

function enqueueSheetRead(entry: Omit<QueuedRead, "resolve" | "reject">): Promise<unknown[][]> {
  const groupKey = `${entry.spreadsheetId}:${entry.block}`;
  return new Promise((resolve, reject) => {
    const queue = queuedReads.get(groupKey) ?? [];
    queue.push({ ...entry, resolve, reject });
    queuedReads.set(groupKey, queue);
    if (queue.length === 1) queueMicrotask(() => { void flushQueuedReads(groupKey); });
  });
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
  const stale = readCache.get(cacheKey);
  const cached = params.fresh ? undefined : stale;
  if (cached && cached.expiresAt > Date.now()) { sheetCacheMetrics.hits += 1; return cached.value; }
  sheetCacheMetrics.misses += 1;

  const pending = pendingReads.get(cacheKey);
  if (pending) { sheetCacheMetrics.coalesced += 1; return pending; }

  const request = enqueueSheetRead({ block, spreadsheetId, sheet: params.sheet, range, cacheKey, stale: stale?.value });

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

  return sheetValuesToRows(values);
}

export function sheetValuesToRows(values: unknown[][]): SheetRow[] {
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

export function getSheetCacheMetrics() { return { ...sheetCacheMetrics, entries: readCache.size, pending: pendingReads.size }; }

export async function readSheetRowsBatch({
  block,
  sheets,
  fresh = false,
}: {
  block: SheetBlock;
  sheets: readonly string[];
  fresh?: boolean;
}): Promise<Record<string, SheetRow[]>> {
  const spreadsheetId = getSpreadsheetId(block);
  const uniqueSheets = [...new Set(sheets)];
  const ranges = uniqueSheets.map((sheet) => canonicalizeReadRange(block, sheet, "A:ZZ"));
  const entries = uniqueSheets.map((sheet, index) => {
    const cacheKey = `${spreadsheetId}:${sheet.toLowerCase()}:${ranges[index]}`;
    return { sheet, range: ranges[index], cacheKey, cached: fresh ? undefined : readCache.get(cacheKey) };
  });
  const missing = entries.filter((entry) => !entry.cached || entry.cached.expiresAt <= Date.now());
  if (missing.length) {
    const batchKey = `${spreadsheetId}:${missing.map((entry) => entry.sheet.toLowerCase()).sort().join(",")}`;
    let pending = pendingBatchReads.get(batchKey);
    if (!pending) {
      pending = (async () => {
        try {
          const response = await sheetRequest(block, missing.map((entry) => entry.sheet).join(","), "values.batchGet", "read", () => getSheetsReadClient().spreadsheets.values.batchGet({
            spreadsheetId,
            ranges: missing.map((entry) => `${quoteSheetName(entry.sheet)}!${entry.range}`),
          }, { timeout: SHEETS_REQUEST_TIMEOUT_MS }));
          const loaded: Record<string, unknown[][]> = {};
          missing.forEach((entry, index) => {
            const values = response.data.valueRanges?.[index]?.values ?? [];
            loaded[entry.sheet] = values;
            readCache.set(entry.cacheKey, { expiresAt: Date.now() + cacheTtl(block), value: values });
          });
          return loaded;
        } catch (error) {
          if (isQuotaError(error) && missing.every((entry) => entry.cached))
            return Object.fromEntries(missing.map((entry) => [entry.sheet, entry.cached!.value]));
          throw withGoogleSheetsErrorContext(error, block, missing.map((entry) => entry.sheet).join(","));
        }
      })();
      pendingBatchReads.set(batchKey, pending);
    }
    try { await pending; } finally { pendingBatchReads.delete(batchKey); }
  }
  return Object.fromEntries(entries.map((entry) => [entry.sheet, sheetValuesToRows(readCache.get(entry.cacheKey)?.value ?? entry.cached?.value ?? [])]));
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
  const client = getSheetsWriteClient();
  const response = await sheetRequest(block, sheet, "values.get", "read", () => client.spreadsheets.values.get(
    {
      spreadsheetId,
      range: `${quoteSheetName(sheet)}!A:ZZ`,
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ));
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

  await sheetRequest(block, sheet, "values.update", "write", () => client.spreadsheets.values.update(
    {
      spreadsheetId,
      range: `${quoteSheetName(sheet)}!A${rowNumber}:${columnIndexToA1(headers.length - 1)}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [next] },
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ), true);
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
  const client = getSheetsWriteClient();
  const sheetNames = [...new Set(rows.map(({ sheet }) => sheet))];
  const schemaResponse = await sheetRequest(block, sheetNames.join(","), "values.batchGet", "read", () => client.spreadsheets.values.batchGet(
    { spreadsheetId, ranges: sheetNames.map((sheet) => `${quoteSheetName(sheet)}!A:ZZ`) },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ));
  const schemaEntries = sheetNames.map((sheet, index) => {
      const existing = schemaResponse.data.valueRanges?.[index]?.values ?? [];
      if (!existing.length) throw new Error(`SCHEMA_INDISPONIBLE:${sheet}`);
      const headers = (existing[0] ?? []).map((value) =>
        normalizeHeader(String(value ?? "")),
      );
      return [sheet, { headers, nextRow: existing.length + 1 }] as const;
    });
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
  await sheetRequest(block, sheetNames.join(","), "values.batchUpdate", "write", () => client.spreadsheets.values.batchUpdate(
    {
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: schemas.map(({ range, values }) => ({ range, values })),
      },
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ), true);
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
  const client = getSheetsWriteClient();
  const sheetNames = [...new Set(rows.map((row) => row.sheet))];
  const schemaResponse = await sheetRequest(block, sheetNames.join(","), "values.batchGet", "read", () => client.spreadsheets.values.batchGet(
    { spreadsheetId, ranges: sheetNames.map((sheet) => `${quoteSheetName(sheet)}!A:ZZ`) },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ));
  const entries = sheetNames.map((sheet, index) => {
    const existing = schemaResponse.data.valueRanges?.[index]?.values ?? [];
    if (!existing.length) throw new Error(`SCHEMA_INDISPONIBLE:${sheet}`);
    return [sheet, {
      headers: (existing[0] ?? []).map((value) => normalizeHeader(String(value ?? ""))),
      existing,
      nextRow: existing.length + 1,
    }] as const;
  });
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
  await sheetRequest(block, sheetNames.join(","), "values.batchUpdate", "write", () => client.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data: data.map(({ range, values }) => ({ range, values })) },
  }, { timeout: SHEETS_REQUEST_TIMEOUT_MS }), true);
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
  const sheets = getSheetsWriteClient();
  const response = await sheetRequest(block, sheetName, "values.get", "read", () => sheets.spreadsheets.values.get(
    {
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!A:ZZ`,
    },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ));
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
  const sheets = getSheetsWriteClient();

  const res = await sheetRequest(resolvedBlock, sheetName, "values.get", "read", () => sheets.spreadsheets.values.get(
    {
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    },
    {
      timeout: SHEETS_REQUEST_TIMEOUT_MS,
    },
  ));

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

  await sheetRequest(resolvedBlock, sheetName, "values.batchUpdate", "write", () => sheets.spreadsheets.values.batchUpdate({
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
  }), true);

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
  const sheets = getSheetsWriteClient();
  const response = await sheetRequest("structure", "CLUBS", "values.get", "read", () => sheets.spreadsheets.values.get(
    { spreadsheetId, range: `${quoteSheetName("CLUBS")}!A:ZZ` },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ));
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
  const sheets = getSheetsWriteClient();
  const response = await sheetRequest("structure", "CLUBS", "values.get", "read", () => sheets.spreadsheets.values.get(
    { spreadsheetId, range: `${quoteSheetName("CLUBS")}!A:ZZ` },
    { timeout: SHEETS_REQUEST_TIMEOUT_MS },
  ));
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
  await sheetRequest("structure", "CLUBS", "values.batchUpdate", "write", () => sheets.spreadsheets.values.batchUpdate(
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
  ), true);
  clearSheetCache(spreadsheetId, "CLUBS");
}
