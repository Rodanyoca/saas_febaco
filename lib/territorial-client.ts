import type { TerritorialKind } from "@/lib/territorial";

export type TerritorialListItem = Record<string, unknown> & {
  id: string;
  nom: string;
  statut: string;
};

export class TerritorialClientError extends Error {
  fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "TerritorialClientError";
    this.fields = fields;
  }
}

export function sortTerritorialItems<T extends { nom: string }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) =>
    left.nom.localeCompare(right.nom, "fr", {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

type ClubLogoPayload = {
  logoUrl?: string;
  logo_drive_id?: string;
  logo_drive_url?: string;
};

export function mergeClubLogo<T extends TerritorialListItem>(
  items: T[],
  clubId: string,
  logo: ClubLogoPayload,
): Array<T & ClubLogoPayload> {
  if (!clubId || !logo.logoUrl) return items;

  return items.map((item) =>
    String(item.id) === clubId ? { ...item, ...logo } : item,
  );
}

export async function saveAndReloadTerritorialItems(
  fetcher: typeof fetch,
  endpoint: string,
  kind: TerritorialKind,
  method: "POST" | "PUT",
  values: Record<string, string>,
  listEndpoint = endpoint,
): Promise<TerritorialListItem[]> {
  return (
    await saveTerritorialEntityAndReload(
      fetcher,
      endpoint,
      kind,
      method,
      values,
      listEndpoint,
    )
  ).items;
}

export async function saveTerritorialEntityAndReload(
  fetcher: typeof fetch,
  endpoint: string,
  kind: TerritorialKind,
  method: "POST" | "PUT",
  values: Record<string, string>,
  listEndpoint = endpoint,
): Promise<{ entity: Record<string, unknown>; items: TerritorialListItem[] }> {
  const writeResponse = await fetcher(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const writePayload = await writeResponse.json();
  if (!writeResponse.ok) {
    throw new TerritorialClientError(
      writePayload?.error?.message || "Écriture impossible.",
      writePayload?.error?.fields || {},
    );
  }

  const listResponse = await fetcher(listEndpoint, { cache: "no-store" });
  const listPayload = await listResponse.json();
  if (!listResponse.ok) {
    throw new TerritorialClientError(
      listPayload?.error?.message ||
        listPayload?.error ||
        "Lecture impossible.",
    );
  }

  return {
    entity: writePayload.entity ?? {},
    items: sortTerritorialItems(listPayload[kind] ?? []),
  };
}
