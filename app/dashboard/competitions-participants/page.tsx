"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDisplayDate } from "@/lib/date-format";

type Participant = { id: string; competitionId: string; competition: string; club: string; equipe: string; categorie: string; sexe: string; groupe: string; dateInscription: string; statut: string };

export default function CompetitionParticipantsPage() {
  const [items, setItems] = useState<Participant[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(""), [query, setQuery] = useState(""), [competition, setCompetition] = useState("all");
  useEffect(() => { let active = true; void fetch("/api/competitions-participants", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Lecture impossible."); if (active) setItems((payload.participants || []).map((item: Participant) => ({ ...item, dateInscription: formatDisplayDate(item.dateInscription) }))); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Lecture impossible."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const competitions = useMemo(() => [...new Map(items.map((item) => [item.competitionId, item.competition])).entries()], [items]);
  const visible = useMemo(() => items.filter((item) => (competition === "all" || item.competitionId === competition) && `${item.competition} ${item.club} ${item.equipe} ${item.groupe}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr"))), [items, competition, query]);
  return <div className="flex min-w-0 flex-col"><Header title="Clubs participants" subtitle="Équipes engagées dans les compétitions"/><main className="min-w-0 space-y-5 p-6">
    <div className="grid gap-3 sm:grid-cols-2"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Rechercher un club ou une équipe"/></div><Select value={competition} onValueChange={setCompetition}><SelectTrigger><SelectValue placeholder="Toutes les compétitions"/></SelectTrigger><SelectContent><SelectItem value="all">Toutes les compétitions</SelectItem>{competitions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></div>
    {loading ? <p className="text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin"/>Chargement…</p> : error ? <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-destructive">{error}</p> : visible.length === 0 ? <p className="rounded-lg border p-6 text-center text-muted-foreground">Aucun club participant.</p> : <><div className="grid gap-3 md:hidden">{visible.map((item) => <article key={item.id} className="min-w-0 rounded-lg border p-4"><Link href={`/dashboard/competitions/${encodeURIComponent(item.competitionId)}`} className="font-semibold hover:underline">{item.competition}</Link><p className="mt-1 font-medium">{item.club}</p><p className="break-words text-sm text-muted-foreground">{item.equipe} · {item.categorie} · {item.sexe}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{item.groupe} · {item.dateInscription}</span><StatusBadge status={item.statut}/></div></article>)}</div><div className="hidden min-w-0 grid-cols-8 md:grid">{["Compétition", "Club", "Équipe engagée", "Catégorie", "Sexe", "Groupe", "Inscription", "Statut"].map((label) => <div key={label} className="min-w-0 break-words border-b p-3 text-xs font-semibold uppercase text-muted-foreground">{label}</div>)}{visible.map((item) => <div key={item.id} className="contents">{[item.competition, item.club, item.equipe, item.categorie, item.sexe, item.groupe, item.dateInscription].map((value, index) => <div key={index} className="min-w-0 break-words border-b p-3 text-sm">{index === 0 ? <Link href={`/dashboard/competitions/${encodeURIComponent(item.competitionId)}`} className="hover:underline">{value}</Link> : value}</div>)}<div className="min-w-0 border-b p-3"><StatusBadge status={item.statut}/></div></div>)}</div></>}
  </main></div>;
}
