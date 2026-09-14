export type GoogleProvider = "sheets" | "drive";
export type GoogleAccess = "read" | "write";

export type GoogleRequestErrorCode =
  | "QUOTA_EXCEEDED"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export class GoogleRequestError extends Error {
  readonly name = "GoogleRequestError";
  constructor(
    public readonly code: GoogleRequestErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) { super(message); }
}

type Metric = { calls: number; failures: number; retries: number; totalDurationMs: number };
const metrics = new Map<string, Metric>();
let totalRetries = 0;
let totalFailures = 0;

function envInt(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function getGoogleRequestConfig() {
  return {
    timeoutMs: envInt("GOOGLE_REQUEST_TIMEOUT_MS", 10_000, 1_000, 120_000),
    maxRetries: envInt("GOOGLE_MAX_RETRIES", 2, 0, 5),
    readConcurrency: envInt("GOOGLE_READ_CONCURRENCY", 3, 1, 20),
    writeConcurrency: envInt("GOOGLE_WRITE_CONCURRENCY", 1, 1, 5),
  };
}

class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  constructor(private readonly limit: number) {}
  async use<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
    try { return await work(); }
    finally { this.active -= 1; this.waiting.shift()?.(); }
  }
}

const initialConfig = getGoogleRequestConfig();
const readSemaphore = new Semaphore(initialConfig.readConcurrency);
const writeSemaphore = new Semaphore(initialConfig.writeConcurrency);

function statusOf(error: unknown): number | undefined {
  const candidate = error as { code?: number | string; response?: { status?: number } };
  const raw = candidate?.response?.status ?? candidate?.code;
  return typeof raw === "number" ? raw : Number.isFinite(Number(raw)) ? Number(raw) : undefined;
}

function headerOf(error: unknown, name: string): string | undefined {
  const headers = (error as { response?: { headers?: unknown } })?.response?.headers;
  if (!headers) return undefined;
  if (typeof (headers as { get?: unknown }).get === "function") return String((headers as { get(name: string): unknown }).get(name) ?? "") || undefined;
  const record = headers as Record<string, unknown>;
  return String(record[name] ?? record[name.toLowerCase()] ?? "") || undefined;
}

function normalizeError(error: unknown): GoogleRequestError {
  if (error instanceof GoogleRequestError) return error;
  const status = statusOf(error);
  const raw = error instanceof Error ? error.message : JSON.stringify(error);
  const quota = status === 429 || /quota exceeded|rate.?limit|resource_exhausted/i.test(raw);
  const timeout = /timeout|timed out|etimedout|econnreset/i.test(raw);
  const unavailable = status === 500 || status === 502 || status === 503 || status === 504;
  if (quota) return new GoogleRequestError("QUOTA_EXCEEDED", "Service Google temporairement saturé. Réessayez dans quelques instants.", 503, true, error);
  if (timeout) return new GoogleRequestError("TIMEOUT", "Le service Google met trop de temps à répondre.", 503, true, error);
  if (unavailable) return new GoogleRequestError("UNAVAILABLE", "Service Google temporairement indisponible.", 503, true, error);
  if (status === 401 || status === 403) return new GoogleRequestError("UNAUTHORIZED", "Accès au service Google refusé.", 503, false, error);
  if (status === 404) return new GoogleRequestError("NOT_FOUND", "Ressource Google introuvable.", 404, false, error);
  if (status === 400) return new GoogleRequestError("INVALID_REQUEST", "Requête Google invalide.", 400, false, error);
  return new GoogleRequestError("UNKNOWN", "Une erreur Google inattendue est survenue.", 503, false, error);
}

function retryAfterMs(error: unknown): number | undefined {
  const value = headerOf(error, "retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export async function executeGoogleRequest<T>({
  provider, module, operation, access, run, idempotent = access === "read",
  maxRetries = getGoogleRequestConfig().maxRetries,
  sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
}: {
  provider: GoogleProvider; module: string; operation: string; access: GoogleAccess;
  run: () => Promise<T>; idempotent?: boolean; maxRetries?: number;
  sleep?: (ms: number) => Promise<void>; random?: () => number;
}): Promise<T> {
  const semaphore = access === "read" ? readSemaphore : writeSemaphore;
  const key = `${provider}:${operation}`;
  const metric = metrics.get(key) ?? { calls: 0, failures: 0, retries: 0, totalDurationMs: 0 };
  metrics.set(key, metric);
  let attempt = 0;
  while (true) {
    const started = Date.now();
    metric.calls += 1;
    try {
      const result = await semaphore.use(run);
      metric.totalDurationMs += Date.now() - started;
      if (process.env.GOOGLE_REQUEST_LOG_LEVEL === "debug") console.info(JSON.stringify({ event: "google_request", provider, module, operation, access, attempt, status: "ok", durationMs: Date.now() - started }));
      return result;
    } catch (cause) {
      metric.totalDurationMs += Date.now() - started;
      metric.failures += 1;
      totalFailures += 1;
      const error = normalizeError(cause);
      const canRetry = idempotent && error.retryable && attempt < maxRetries;
      console.warn(JSON.stringify({ event: "google_request", provider, module, operation, access, attempt, status: "error", errorCode: error.code, retry: canRetry, durationMs: Date.now() - started }));
      if (!canRetry) throw error;
      const base = envInt("GOOGLE_RETRY_BASE_DELAY_MS", 200, 25, 5_000);
      const cap = envInt("GOOGLE_RETRY_MAX_DELAY_MS", 2_000, base, 30_000);
      const retryAfter = retryAfterMs(cause);
      const delay = retryAfter ?? Math.floor(random() * Math.min(cap, base * 2 ** attempt));
      metric.retries += 1;
      totalRetries += 1;
      attempt += 1;
      await sleep(Math.min(cap, delay));
    }
  }
}

export function getGoogleRequestMetrics() {
  return { total: [...metrics.values()].reduce((sum, item) => sum + item.calls, 0), retries: totalRetries, failures: totalFailures, byOperation: Object.fromEntries(metrics) };
}

export function resetGoogleRequestStateForTests() { metrics.clear(); totalRetries = 0; totalFailures = 0; }
