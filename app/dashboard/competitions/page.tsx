"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table";
import { Header } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { CompetitionCreateModal } from "@/components/dashboard/competition-create-modal";
import { Button } from "@/components/ui/button";
import { type Competition, getFilterOptions } from "@/lib/models";
import { sortCompetitionsByStartDate } from "@/lib/competition-client";

const competitionRouteId = (id: string) => encodeURIComponent(id).replace(/%/g, "~");
const columns: Column<Competition>[] = [
  { key: "saison", header: "Saison" },
  { key: "nom", header: "Nom de la compétition", className: "font-medium" },
  { key: "dateDebut", header: "Début" },
  { key: "dateFin", header: "Fin" },
  { key: "pays", header: "Pays" },
  { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut} /> },
];

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]), [canCreate, setCanCreate] = useState(false), [createOpen, setCreateOpen] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    let canceled = false;
    void fetch("/api/competitions", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || data?.error || "Lecture impossible.");
      if (!canceled) { setCompetitions(sortCompetitionsByStartDate(Array.isArray(data?.competitions) ? data.competitions : [])); setError(""); }
    }).catch((reason) => { if (!canceled) { setCompetitions([]); setError(reason instanceof Error ? reason.message : "Lecture impossible."); } });
    return () => { canceled = true; };
  }, []);
  useEffect(() => { void fetch("/api/auth/me").then((response) => response.json()).then((data) => setCanCreate(data?.user?.role === "federal")).catch(() => setCanCreate(false)); }, []);
  const filters: Filter[] = useMemo(() => [
    { key: "saison", label: "Saison", options: getFilterOptions(competitions, "saison") },
    { key: "pays", label: "Pays", options: getFilterOptions(competitions, "pays") },
    { key: "statut", label: "Statut", options: getFilterOptions(competitions, "statut") },
  ], [competitions]);
  return <div className="flex flex-col">
    <Header title="Compétitions" subtitle="Toutes les compétitions FEBACO" />
    <main className="flex-1 space-y-4 p-4 sm:p-6">
      {error ? <p className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p> : null}
      {canCreate ? <div className="flex justify-end"><Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Créer une compétition</Button></div> : null}
      <DataTable data={competitions} columns={columns} filters={filters} searchPlaceholder="Rechercher une compétition..." detailHref={(item) => `/dashboard/competitions/${competitionRouteId(item.id)}`} idKey="__key" />
      <CompetitionCreateModal open={createOpen} onOpenChange={setCreateOpen} onCreated={(competition) => setCompetitions((current) => sortCompetitionsByStartDate([competition, ...current]))} />
    </main>
  </div>;
}
