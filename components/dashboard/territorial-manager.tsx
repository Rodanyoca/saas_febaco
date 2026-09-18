"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import {
  DataTable,
  type Column,
  type Filter,
} from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { TerritorialKind } from "@/lib/territorial";
import {
  mergeClubLogo,
  saveTerritorialEntityAndReload,
  sortTerritorialItems,
  TerritorialClientError,
} from "@/lib/territorial-client";

type Item = Record<string, unknown> & {
  id: string;
  nom: string;
  statut: string;
};
type Option = { id: string; label: string };

function clubInitials(name: unknown): string {
  return String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CL";
}
type Field = {
  key: string;
  label: string;
  required?: boolean;
  type?: "email" | "date" | "number" | "textarea";
  ref?: string;
  parent?: TerritorialKind;
};

const definitions: Record<
  TerritorialKind,
  {
    title: string;
    singular: string;
    endpoint: string;
    fields: Field[];
    columns: Column<Item>[];
    filters: Filter[];
  }
> = {
  ligues: {
    title: "Ligues",
    singular: "ligue",
    endpoint: "/api/ligues",
    fields: [
      { key: "nom_ligue", label: "Nom de la ligue", required: true },
      { key: "sigle_ligue", label: "Sigle" },
      {
        key: "id_province",
        label: "Province",
        required: true,
        ref: "PROVINCES",
      },
      { key: "telephone", label: "Téléphone" },
      { key: "email", label: "E-mail", type: "email" },
      { key: "année_creation", label: "Année de création", type: "number" },
      { key: "date_affiliation_ligue", label: "Date d’affiliation", type: "date" },
      { key: "id_ligue_coc", label: "Identifiant COC" },
      { key: "statut", label: "Statut", required: true },
      { key: "observations", label: "Observations", type: "textarea" },
    ],
    columns: [
      { key: "id", header: "ID", className: "font-mono" },
      { key: "nom", header: "Ligue", className: "font-medium" },
      { key: "sigle", header: "Sigle" },
      { key: "province", header: "Province" },
      {
        key: "statut",
        header: "Statut",
        render: (i) => <StatusBadge status={i.statut} />,
      },
    ],
    filters: [
      { key: "province", label: "Province", options: [] },
      { key: "statut", label: "Statut", options: [] },
    ],
  },
  ententes: {
    title: "Ententes",
    singular: "entente",
    endpoint: "/api/ententes",
    fields: [
      { key: "nom_entente", label: "Nom de l’entente", required: true },
      { key: "sigle_entente", label: "Sigle" },
      { key: "id_ligue", label: "Ligue", required: true, parent: "ligues" },
      { key: "id_ville", label: "Ville", ref: "VILLES" },
      { key: "telephone", label: "Téléphone" },
      { key: "email", label: "E-mail", type: "email" },
      { key: "date_creation", label: "Date de création", type: "date" },
      {
        key: "date_reconnaissance",
        label: "Date de reconnaissance",
        type: "date",
      },
      { key: "id_entente_coc", label: "Identifiant COC" },
      { key: "statut", label: "Statut", required: true },
      { key: "observations", label: "Observations", type: "textarea" },
    ],
    columns: [
      { key: "id", header: "ID", className: "font-mono" },
      { key: "nom", header: "Entente", className: "font-medium" },
      { key: "sigle", header: "Sigle" },
      { key: "ligue", header: "Ligue" },
      {
        key: "statut",
        header: "Statut",
        render: (i) => <StatusBadge status={i.statut} />,
      },
    ],
    filters: [
      { key: "ligue", label: "Ligue", options: [] },
      { key: "statut", label: "Statut", options: [] },
    ],
  },
  clubs: {
    title: "Clubs",
    singular: "club",
    endpoint: "/api/clubs",
    fields: [
      { key: "nom_club", label: "Nom du club", required: true },
      { key: "sigle_club", label: "Sigle" },
      {
        key: "id_entente",
        label: "Entente",
        required: true,
        parent: "ententes",
      },
      {
        key: "id_categorie_club",
        label: "Catégorie",
        required: true,
        ref: "CATEGORIES_CLUB",
      },
      {
        key: "id_niveau_competitif_club",
        label: "Niveau compétitif",
        ref: "NIVEAUX_COMPETITIFS_CLUB",
      },
      { key: "id_sexe", label: "Sexe", ref: "SEXES" },
      { key: "id_ville", label: "Ville", ref: "VILLES" },
      { key: "date_creation", label: "Date de création", type: "date" },
      { key: "date_affiliation", label: "Date d’affiliation", type: "date" },
      { key: "telephone", label: "Téléphone" },
      { key: "email", label: "E-mail", type: "email" },
      { key: "id_club_coc", label: "Identifiant COC" },
      { key: "statut", label: "Statut", required: true },
      { key: "observations", label: "Observations", type: "textarea" },
    ],
    columns: [
      { key: "id", header: "ID", className: "font-mono" },
      {
        key: "logoUrl",
        header: "Logo",
        render: (i) => (
          <Avatar className="size-10 rounded-lg border bg-background">
            <AvatarImage
              src={String(i.logoUrl || "") || undefined}
              alt={`Logo de ${i.nom}`}
              className="object-contain p-1"
            />
            <AvatarFallback className="rounded-lg text-xs">
              {clubInitials(i.nom)}
            </AvatarFallback>
          </Avatar>
        ),
      },
      { key: "nom", header: "Club", className: "font-medium" },
      { key: "categorie", header: "Catégorie" },
      { key: "entente", header: "Entente" },
      { key: "ligue", header: "Ligue" },
      {
        key: "statut",
        header: "Statut",
        render: (i) => <StatusBadge status={i.statut} />,
      },
    ],
    filters: [
      { key: "ligue", label: "Ligue", options: [] },
      { key: "entente", label: "Entente", options: [] },
      { key: "statut", label: "Statut", options: [] },
    ],
  },
  equipes: {
    title: "Équipes",
    singular: "équipe",
    endpoint: "/api/equipes",
    fields: [
      { key: "nom_equipe", label: "Nom de l’équipe", required: true },
      { key: "id_club", label: "Club", required: true, parent: "clubs" },
      {
        key: "id_categorie_age",
        label: "Catégorie d’âge",
        required: true,
        ref: "CATEGORIES_AGE",
      },
      { key: "id_sexe", label: "Sexe", required: true, ref: "SEXES" },
      { key: "id_equipe_coc", label: "Identifiant COC" },
      { key: "statut", label: "Statut", required: true },
      { key: "observations", label: "Observations", type: "textarea" },
    ],
    columns: [
      { key: "id", header: "ID", className: "font-mono" },
      { key: "nom", header: "Équipe", className: "font-medium" },
      { key: "club", header: "Club" },
      { key: "categorie", header: "Catégorie" },
      { key: "genre", header: "Sexe" },
      {
        key: "statut",
        header: "Statut",
        render: (i) => <StatusBadge status={i.statut} />,
      },
    ],
    filters: [
      { key: "club", label: "Club", options: [] },
      { key: "statut", label: "Statut", options: [] },
    ],
  },
};

const aliases: Record<string, string> = {
  nom_ligue: "nom",
  nom_entente: "nom",
  nom_club: "nom",
  nom_equipe: "nom",
  sigle_ligue: "sigle",
  sigle_entente: "sigle",
  sigle_club: "sigle",
  id_province: "provinceId",
  id_ligue: "ligueId",
  id_entente: "ententeId",
  id_club: "clubId",
  id_categorie_club: "categorieId",
  id_categorie_age: "categorieId",
  id_sexe: "sexeId",
  observations: "observation",
};
export const editableValue = (value: unknown): string => {
  const text = String(value ?? "").trim();
  return text === "-" || text.toLocaleLowerCase("fr") === "non renseigné"
    ? ""
    : text;
};
export const normalizeTerritorialRow = (
  row: Record<string, unknown>,
  kind: TerritorialKind,
  refs: Record<string, Option[]> = {},
  parents: Record<string, Option[]> = {},
): Item => {
  const referenceLabel = (sheet: string, id: unknown) =>
    refs[sheet]?.find((option) => option.id === String(id ?? ""))?.label;
  const parentLabel = (parent: TerritorialKind, id: unknown) =>
    parents[parent]?.find((option) => option.id === String(id ?? ""))?.label;
  return {
    ...row,
    id: String(row.id ?? row[`id_${kind.slice(0, -1)}`] ?? ""),
    nom: String(row.nom ?? row[`nom_${kind.slice(0, -1)}`] ?? ""),
    sigle: String(row.sigle ?? row[`sigle_${kind.slice(0, -1)}`] ?? ""),
    statut: String(row.statut ?? ""),
    province: String(
      row.province ??
        referenceLabel("PROVINCES", row.id_province) ??
        row.id_province ??
        "Non renseigné",
    ),
    ligue: String(
      row.ligue ??
        parentLabel("ligues", row.id_ligue) ??
        row.id_ligue ??
        "Non renseigné",
    ),
    entente: String(
      row.entente ??
        parentLabel("ententes", row.id_entente) ??
        row.id_entente ??
        "Non renseigné",
    ),
    club: String(
      row.club ??
        parentLabel("clubs", row.id_club) ??
        row.id_club ??
        "Non renseigné",
    ),
    categorie: String(
      row.categorie ??
        row.id_categorie_club ??
        row.id_categorie_age ??
        "Non renseigné",
    ),
    genre: String(row.genre ?? row.id_sexe ?? "Non renseigné"),
  };
};

export function TerritorialManager({ kind }: { kind: TerritorialKind }) {
  const editOpened = useRef(false);
  const def = definitions[kind],
    { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [federal, setFederal] = useState(false),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Item | null>(null),
    [values, setValues] = useState<Record<string, string>>({ statut: "ACTIF" }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [saving, setSaving] = useState(false),
    [logoFile, setLogoFile] = useState<File | null>(null),
    [refs, setRefs] = useState<Record<string, Option[]>>({}),
    [parents, setParents] = useState<Record<string, Option[]>>({}),
    firstInvalid = useRef<HTMLInputElement | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(def.endpoint, { cache: "no-store" }),
        j = await r.json();
      if (!r.ok)
        throw new Error(j?.error?.message || j?.error || "Lecture impossible.");
      setItems(
        sortTerritorialItems(
          (j[kind] ?? []).map((x: Record<string, unknown>) =>
            normalizeTerritorialRow(x, kind),
          ),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture impossible.");
    } finally {
      setLoading(false);
    }
  }, [def.endpoint, kind]);
  useEffect(() => {
    void load();
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setFederal(j?.user?.role === "federal"));
  }, [load]);
  const options = useMemo(
    () =>
      def.filters.map((f) => ({
        ...f,
        options: Array.from(
          new Set(items.map((i) => String(i[f.key] ?? "")).filter(Boolean)),
        ).map((v) => ({ value: v, label: v })),
      })),
    [def.filters, items],
  );
  const begin = async (item?: Item) => {
    setEditing(item ?? null);
    setLogoFile(null);
    setErrors({});
    setValues(
      Object.fromEntries(
        def.fields.map((f) => [
          f.key,
          editableValue(
            item?.[f.key] ??
              item?.[aliases[f.key]] ??
              (f.key === "statut" ? "ACTIF" : ""),
          ),
        ]),
      ),
    );
    setOpen(true);
    try {
      const [rr, ...parentResponses] = await Promise.all([
        fetch("/api/structure-territoriale/referentiels"),
        ...Array.from(
          new Set(def.fields.flatMap((f) => (f.parent ? [f.parent] : []))),
        ).map((p) => fetch(`/api/${p}`)),
      ]);
      const rj = await rr.json();
      if (!rr.ok) throw new Error(rj.error || "Référentiels indisponibles.");
      setRefs(rj.referentiels || {});
      const next: Record<string, Option[]> = {};
      for (let x = 0; x < parentResponses.length; x++) {
        const p = Array.from(
          new Set(def.fields.flatMap((f) => (f.parent ? [f.parent] : []))),
        )[x];
        const pj = await parentResponses[x].json();
        next[p] = (pj[p] || []).map((v: Item) => ({ id: v.id, label: v.nom }));
      }
      setParents(next);
    } catch (e) {
      setErrors({
        _form: e instanceof Error ? e.message : "Référentiels indisponibles.",
      });
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const url = editing
        ? `${def.endpoint}/${encodeURIComponent(editing.id)}`
        : def.endpoint;
      const saved = await saveTerritorialEntityAndReload(
        fetch,
        url,
        kind,
        editing ? "PUT" : "POST",
        values,
        def.endpoint,
      );
      const entityId = String(
        saved.entity.id ?? saved.entity.id_club ?? editing?.id ?? "",
      );
      let uploadedLogo: {
        logoUrl?: string;
        logo_drive_id?: string;
        logo_drive_url?: string;
      } = {};
      if (kind === "clubs" && logoFile) {
        const form = new FormData();
        form.set("file", logoFile);
        form.set("clubId", entityId);
        const response = await fetch("/api/upload/club-logo", {
            method: "POST",
            body: form,
          }),
          payload = await response.json();
        if (!response.ok)
          throw new TerritorialClientError(
            payload.error || "Téléversement du logo impossible.",
            { logo: "Logo non enregistré." },
          );
        uploadedLogo = payload;
      }
      setItems(
        sortTerritorialItems(
          mergeClubLogo(saved.items, entityId, uploadedLogo).map((item) =>
            normalizeTerritorialRow(item, kind),
          ),
        ),
      );
      setLogoFile(null);
      setOpen(false);
      toast({
        title: editing ? "Modification enregistrée" : "Création enregistrée",
        description: `La ${def.singular} a été enregistrée.`,
      });
    } catch (error) {
      if (error instanceof TerritorialClientError)
        setErrors({ ...error.fields, _form: error.message });
      else setErrors({ _form: "Service temporairement indisponible." });
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    if (!id || editOpened.current || !items.length || !federal) return;
    const item = items.find((i) => i.id === id);
    if (item) {
      editOpened.current = true;
      void begin(item);
    }
  }, [items, federal]);
  useEffect(() => {
    const key = Object.keys(errors).find((k) => k !== "_form");
    if (key) document.getElementById(`territorial-${key}`)?.focus();
  }, [errors]);
  return (
    <div className="flex flex-col">
      <Header
        title={def.title}
        subtitle={`Structure territoriale · ${items.length} élément${items.length > 1 ? "s" : ""}`}
      />
      <div className="flex-1 space-y-5 p-4 md:p-6">
        <div className="flex justify-end">
          {federal ? (
            <Button onClick={() => void begin()}>
              <Plus />
              Ajouter une {def.singular}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              Consultation uniquement
            </span>
          )}
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-5"
          >
            <p>{error}</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => void load()}
            >
              <RefreshCw />
              Réessayer
            </Button>
          </div>
        ) : loading ? (
          <p className="text-muted-foreground">
            <Loader2 className="mr-2 inline animate-spin" />
            Chargement…
          </p>
        ) : (
          <DataTable
            data={items}
            columns={def.columns}
            filters={options}
            searchPlaceholder={`Rechercher une ${def.singular}…`}
            idKey="id"
            detailHref={(i) => `/dashboard/${kind}/${encodeURIComponent(i.id)}`}
            renderActions={
              federal
                ? (i) => (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void begin(i)}
                      aria-label={`Modifier ${i.nom}`}
                      title="Modifier"
                    >
                      <Pencil />
                    </Button>
                  )
                : undefined
            }
            renderMobileCard={(i) => (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {kind === "clubs" ? (
                      <Avatar className="size-12 shrink-0 rounded-lg border bg-background">
                        <AvatarImage
                          src={String(i.logoUrl || "") || undefined}
                          alt={`Logo de ${i.nom}`}
                          className="object-contain p-1"
                        />
                        <AvatarFallback className="rounded-lg text-xs">
                          {clubInitials(i.nom)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{i.nom}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {i.id}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={i.statut} />
                </div>
                <div className="mt-4 flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link
                      href={`/dashboard/${kind}/${encodeURIComponent(i.id)}`}
                      aria-label={`Voir ${i.nom}`}
                      title="Voir"
                    >
                      <Eye />
                    </Link>
                  </Button>
                  {federal ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void begin(i)}
                      aria-label={`Modifier ${i.nom}`}
                      title="Modifier"
                    >
                      <Pencil />
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          />
        )}
      </div>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!saving) setOpen(v);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Modifier" : "Ajouter"} une {def.singular}
            </SheetTitle>
            <SheetDescription>
              L’identifiant est généré par le serveur et devient immuable.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={(e) => void submitWrap(e)}
            className="space-y-4 px-4 pb-24"
          >
            {errors._form ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {errors._form}
              </p>
            ) : null}
            {def.fields.map((f, index) => {
              const opts = f.ref
                ? refs[f.ref]
                : f.parent
                  ? parents[f.parent]
                  : undefined;
              return (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`territorial-${f.key}`}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </Label>
                  {opts || f.key === "statut" ? (
                    <Select
                      value={values[f.key] || undefined}
                      onValueChange={(v) =>
                        setValues((s) => ({ ...s, [f.key]: v }))
                      }
                    >
                      <SelectTrigger
                        id={`territorial-${f.key}`}
                        className="w-full"
                        aria-invalid={!!errors[f.key]}
                      >
                        <SelectValue
                          placeholder={
                            opts?.length
                              ? `Sélectionner ${f.label.toLowerCase()}`
                              : "Liste indisponible"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {f.key === "statut"
                          ? ["ACTIF", "INACTIF"].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))
                          : opts?.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.label}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={`territorial-${f.key}`}
                      value={values[f.key] || ""}
                      onChange={(e) =>
                        setValues((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      ref={index === 0 ? firstInvalid : undefined}
                      id={`territorial-${f.key}`}
                      type={f.type || "text"}
                      value={values[f.key] || ""}
                      onChange={(e) =>
                        setValues((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                      aria-invalid={!!errors[f.key]}
                    />
                  )}{" "}
                  {errors[f.key] ? (
                    <p className="text-sm text-destructive">{errors[f.key]}</p>
                  ) : null}
                </div>
              );
            })}
            {kind === "clubs" ? (
              <div className="space-y-2">
                <Label htmlFor="territorial-logo">Logo du club</Label>
                {editing?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(editing.logoUrl)} alt={`Logo actuel de ${editing.nom}`} className="h-20 w-20 rounded-lg border object-contain p-1" />
                ) : null}
                <Input
                  id="territorial-logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou WebP, 5 Mo maximum. Un nouveau fichier remplace le logo actuel.
                </p>
                {errors.logo ? <p className="text-sm text-destructive">{errors.logo}</p> : null}
              </div>
            ) : null}
            <SheetFooter className="px-0">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !!errors._form}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );

  function submitWrap(e: React.FormEvent) {
    void submit(e);
  }
}
