"use client";

import { useEffect, useState } from "react";
import type { Equipe } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; label: string };
type Values = Record<string, string>;

const emptyValues = (clubId: string): Values => ({
  nom_equipe: "",
  id_club: clubId,
  id_discipline: "",
  id_categorie_age: "",
  id_sexe: "",
  id_equipe_coc: "",
  statut: "ACTIF",
  observations: "",
});

export function EquipeFormModal({
  open,
  onOpenChange,
  clubId,
  equipe,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  equipe: Equipe | null;
  onSaved: () => Promise<void> | void;
}) {
  const [values, setValues] = useState<Values>(() => emptyValues(clubId));
  const [refs, setRefs] = useState<Record<string, Option[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = (equipe ?? {}) as Equipe & Record<string, unknown>;
    setValues({
      nom_equipe: String(source.nom_equipe ?? source.nom ?? ""),
      id_club: clubId,
      id_discipline: String(source.id_discipline ?? ""),
      id_categorie_age: String(source.id_categorie_age ?? ""),
      id_sexe: String(source.id_sexe ?? ""),
      id_equipe_coc: String(source.id_equipe_coc ?? ""),
      statut: String(source.statut ?? "ACTIF"),
      observations: String(source.observations ?? source.observation ?? ""),
    });
    setErrors({});
    void fetch("/api/structure-territoriale/referentiels", {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "Référentiels indisponibles.");
        setRefs(payload.referentiels || {});
      })
      .catch((error) =>
        setErrors({
          _form:
            error instanceof Error
              ? error.message
              : "Référentiels indisponibles.",
        }),
      );
  }, [clubId, equipe, open]);

  const set = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const url = equipe
        ? `/api/equipes/${encodeURIComponent(equipe.id)}`
        : "/api/equipes";
      const response = await fetch(url, {
        method: equipe ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, id_club: clubId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setErrors({
          ...(payload?.error?.fields || {}),
          _form: payload?.error?.message || "Enregistrement impossible.",
        });
        return;
      }
      await onSaved();
      onOpenChange(false);
    } catch {
      setErrors({ _form: "Service temporairement indisponible." });
    } finally {
      setSaving(false);
    }
  };

  const referenceField = (key: string, label: string, sheet: string) => (
    <div className="space-y-2">
      <Label htmlFor={`equipe-${key}`}>{label} *</Label>
      <Select value={values[key]} onValueChange={(value) => set(key, value)}>
        <SelectTrigger id={`equipe-${key}`} aria-invalid={Boolean(errors[key])}>
          <SelectValue placeholder={`Sélectionner ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {(refs[sheet] || []).map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors[key] ? (
        <p className="text-sm text-destructive">{errors[key]}</p>
      ) : null}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {equipe ? "Modifier l’équipe" : "Créer une équipe"}
          </DialogTitle>
          <DialogDescription>
            L’équipe sera rattachée au club de cette fiche.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {errors._form ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errors._form}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="equipe-nom">Nom de l’équipe *</Label>
            <Input
              id="equipe-nom"
              value={values.nom_equipe}
              onChange={(e) => set("nom_equipe", e.target.value)}
              aria-invalid={Boolean(errors.nom_equipe)}
            />
            {errors.nom_equipe ? (
              <p className="text-sm text-destructive">{errors.nom_equipe}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {referenceField("id_discipline", "Discipline", "DISCIPLINES")}
            {referenceField(
              "id_categorie_age",
              "Catégorie d’âge",
              "CATEGORIES_AGE",
            )}
            {referenceField("id_sexe", "Sexe", "SEXES")}
            <div className="space-y-2">
              <Label htmlFor="equipe-statut">Statut *</Label>
              <Select
                value={values.statut}
                onValueChange={(value) => set("statut", value)}
              >
                <SelectTrigger id="equipe-statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIF">ACTIF</SelectItem>
                  <SelectItem value="INACTIF">INACTIF</SelectItem>
                </SelectContent>
              </Select>
              {errors.statut ? (
                <p className="text-sm text-destructive">{errors.statut}</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipe-coc">Identifiant COC</Label>
            <Input
              id="equipe-coc"
              value={values.id_equipe_coc}
              onChange={(e) => set("id_equipe_coc", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipe-observations">Observations</Label>
            <Textarea
              id="equipe-observations"
              value={values.observations}
              onChange={(e) => set("observations", e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
