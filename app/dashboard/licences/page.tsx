"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table";
import { LicenceEditor, type LicenceView } from "@/components/dashboard/licence-editor";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Option = { id: string; label: string };
const emptyReferences = { seasons: [] as Option[], statuses: [] as Option[], teams: [] as Option[], athletes: [] as Option[] };
export default function LicencesPage() {
  const [licences, setLicences] = useState<LicenceView[]>([]), [references, setReferences] = useState(emptyReferences), [loading, setLoading] = useState(true), [error, setError] = useState(""), [federal, setFederal] = useState(false), [editorOpen, setEditorOpen] = useState(false), [editing, setEditing] = useState<LicenceView | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/licences", { cache: "no-store" }), data = await response.json(); if (!response.ok) throw new Error(data?.error?.message || "Lecture impossible."); setLicences(data.licences || []); setReferences(data.references || emptyReferences); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Lecture impossible."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); void fetch("/api/auth/me").then((response) => response.json()).then((data) => setFederal(data?.user?.role === "federal")); }, [load]);
  const columns: Column<LicenceView>[] = useMemo(() => [
    { key: "numero", header: "N° licence", className: "font-mono" }, { key: "athleteNom", header: "Athlète", className: "font-medium" }, { key: "saison", header: "Saison" }, { key: "equipeNom", header: "Équipe" }, { key: "clubNom", header: "Club" }, { key: "dateDelivrance", header: "Délivrée le" }, { key: "statut", header: "Statut", render: (item) => <StatusBadge status={item.statut}/> },
  ], []);
  const filters: Filter[] = useMemo(() => [
    { key: "saison", label: "Saison", options: references.seasons.map((item) => ({ value: item.label, label: item.label })) },
    { key: "equipeId", label: "Équipe", options: references.teams.map((item) => ({ value: item.id, label: item.label })) },
    { key: "statusId", label: "Statut", options: references.statuses.map((item) => ({ value: item.id, label: item.label })) },
  ], [references]);
  return <div className="flex flex-col"><Header title="Licences" subtitle="Consultation et renouvellement des licences d’athlètes"/><main className="flex-1 space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap justify-end gap-2">{federal ? <Button onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus/>Renouveler des licences</Button> : null}</div>
    {error ? <Card className="border-destructive/40"><CardContent className="flex flex-col items-center gap-3 py-8 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void load()}><RefreshCw/>Réessayer</Button></CardContent></Card> : loading ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement des licences…</CardContent></Card> : <DataTable data={licences} columns={columns} filters={filters} idKey="__key" searchPlaceholder="Rechercher un athlète…" renderActions={federal ? (item) => <Button size="icon-sm" variant="ghost" aria-label={`Modifier la licence de ${item.athleteNom}`} onClick={() => { setEditing(item); setEditorOpen(true); }}><Pencil/></Button> : undefined} renderMobileCard={(item) => <Card><CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.athleteNom}</p><p className="font-mono text-xs text-muted-foreground">{item.numero || item.id}</p></div><StatusBadge status={item.statut}/></div><div className="grid grid-cols-2 gap-2 text-sm"><p><span className="block text-xs text-muted-foreground">Saison</span>{item.saison}</p><p><span className="block text-xs text-muted-foreground">Délivrée le</span>{item.dateDelivrance}</p><p><span className="block text-xs text-muted-foreground">Équipe</span>{item.equipeNom}</p><p><span className="block text-xs text-muted-foreground">Club</span>{item.clubNom}</p></div>{federal ? <Button className="w-full" variant="outline" onClick={() => { setEditing(item); setEditorOpen(true); }}><Pencil/>Modifier</Button> : null}</CardContent></Card>}/>} 
    <LicenceEditor open={editorOpen} onOpenChange={setEditorOpen} references={references} editing={editing} onSaved={() => void load()}/>
  </main></div>;
}
