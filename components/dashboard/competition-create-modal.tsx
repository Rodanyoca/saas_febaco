"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Competition } from "@/lib/models";

type Option = { id: string; label: string };
type Refs = {
  types: Option[];
  disciplines: Option[];
  seasons: Option[];
};
const emptyRefs: Refs = {
  types: [],
  disciplines: [],
  seasons: [],
};
const blank = {
  numero_edition: "",
  nom_competition: "",
  id_type_competition: "",
  id_discipline: "",
  id_saison: "",
  date_debut: "",
  date_fin: "",
  pays: "",
  lieu: "",
  statut: "PLANIFIEE",
  observations: "",
};

export function CompetitionCreateModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (competition: Competition) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(blank),
    [refs, setRefs] = useState<Refs>(emptyRefs),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setValues(blank);
    setErrors({});
    void fetch("/api/competitions/referentiels", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Référentiels indisponibles.");
        setRefs(data);
      })
      .catch((error) =>
        setErrors({
          _form:
            error instanceof Error
              ? error.message
              : "Référentiels indisponibles.",
        }),
      );
  }, [open]);
  const set = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const select = (key: string, label: string, options: Option[]) => (
    <div className="space-y-2">
      <Label htmlFor={`competition-${key}`}>{label} *</Label>
      <Select
        value={values[key]}
        onValueChange={(value) => set(key, value)}
        disabled={saving}
      >
        <SelectTrigger
          id={`competition-${key}`}
          aria-invalid={Boolean(errors[key])}
        >
          <SelectValue placeholder="Sélectionner" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
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
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const response = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({
          ...(data.error?.fields || {}),
          _form: data.error?.message || "Création impossible.",
        });
        return;
      }
      onCreated(data.competition);
      onOpenChange(false);
    } catch {
      setErrors({ _form: "Service temporairement indisponible." });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer une compétition</DialogTitle>
          <DialogDescription>
            L’identifiant FEBACO sera généré automatiquement.
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
            <Label htmlFor="competition-nom">Nom *</Label>
            <Input
              id="competition-nom"
              value={values.nom_competition}
              onChange={(event) => set("nom_competition", event.target.value)}
              aria-invalid={Boolean(errors.nom_competition)}
            />
            {errors.nom_competition ? (
              <p className="text-sm text-destructive">
                {errors.nom_competition}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="competition-edition">Numéro d’édition</Label>
            <Input
              id="competition-edition"
              value={values.numero_edition}
              onChange={(event) => set("numero_edition", event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {select("id_type_competition", "Type", refs.types)}
            {select("id_discipline", "Discipline", refs.disciplines)}
            {select("id_saison", "Saison", refs.seasons)}
            <div className="space-y-2">
              <Label htmlFor="competition-statut">Statut *</Label>
              <Select
                value={values.statut}
                onValueChange={(value) => set("statut", value)}
              >
                <SelectTrigger id="competition-statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"].map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="competition-debut">Date de début *</Label>
              <Input
                id="competition-debut"
                type="date"
                value={values.date_debut}
                onChange={(event) => set("date_debut", event.target.value)}
              />
              {errors.date_debut ? (
                <p className="text-sm text-destructive">{errors.date_debut}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="competition-fin">Date de fin *</Label>
              <Input
                id="competition-fin"
                type="date"
                value={values.date_fin}
                onChange={(event) => set("date_fin", event.target.value)}
              />
              {errors.date_fin ? (
                <p className="text-sm text-destructive">{errors.date_fin}</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="competition-pays">Pays *</Label>
            <Input
              id="competition-pays"
              value={values.pays}
              onChange={(event) => set("pays", event.target.value)}
            />
            {errors.pays ? (
              <p className="text-sm text-destructive">{errors.pays}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="competition-lieu">Lieu</Label>
            <Input
              id="competition-lieu"
              value={values.lieu}
              onChange={(event) => set("lieu", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="competition-observations">Observations</Label>
            <Textarea
              id="competition-observations"
              value={values.observations}
              onChange={(event) => set("observations", event.target.value)}
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
              {saving ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
