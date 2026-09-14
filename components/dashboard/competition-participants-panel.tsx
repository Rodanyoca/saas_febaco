"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDisplayDate } from "@/lib/date-format";

type Club = { id: string; nom: string };
type Team = { id: string; clubId: string; nom: string; disciplineId: string; categorieId: string; sexeId: string; categorie: string; sexe: string };
type Event = { id: string; label: string; disciplineId: string; categorieId: string; sexeId: string };
type Group = { id: string; phaseId: string; label: string };
type Phase = { id: string; eventId: string; label: string; modeId: string; statut: string };
type Participant = { id: string; clubId: string; equipeId: string; club: string; equipe: string; categorie: string; sexe: string; groupe: string; dateInscription: string; statut: string };
type Payload = { participants: Participant[]; clubs: Club[]; teams: Team[]; events: Event[]; phases: Phase[]; groups: Group[]; modes: { id: string; label: string }[] };

export function CompetitionParticipantsPanel({ competitionId, readOnly=false }: { competitionId: string; readOnly?: boolean }) {
  const [data, setData] = useState<Payload>({ participants: [], clubs: [], teams: [], events: [], phases: [], groups: [], modes: [] });
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [federal, setFederal] = useState(false), [open, setOpen] = useState(false), [saving, setSaving] = useState(false), [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({}), [eventId, setEventId] = useState(""), [phaseId, setPhaseId] = useState(""), [groupId, setGroupId] = useState(""), [date, setDate] = useState(new Date().toISOString().slice(0, 10)), [status, setStatus] = useState("INSCRIT"), [observations, setObservations] = useState(""), [errors, setErrors] = useState<Record<string, string>>({});
  const endpoint = `/api/competitions/${encodeURIComponent(competitionId)}/participants`;
  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try { const response = await fetch(endpoint, { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || payload?.error || "Lecture impossible."); setData(payload); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Lecture impossible."); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { void load(); void fetch("/api/auth/me").then((response) => response.json()).then((payload) => setFederal(!readOnly && payload?.user?.role === "federal")).catch(() => setFederal(false)); }, [load, readOnly]);
  const participatingTeamIds = useMemo(() => new Set(data.participants.map((participant) => participant.equipeId).filter(Boolean)), [data.participants]);
  const selectedEvent = data.events.find((event) => event.id === eventId);
  const teamsFor = (clubId: string) => data.teams.filter((team) => team.clubId === clubId && (!selectedEvent || (team.categorieId === selectedEvent.categorieId && team.sexeId === selectedEvent.sexeId && (!team.disciplineId || team.disciplineId === selectedEvent.disciplineId))) && !participatingTeamIds.has(team.id));
  const filtered = useMemo(() => data.clubs.filter((club) => club.nom.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr")) && teamsFor(club.id).length > 0), [data.clubs, data.teams, eventId, participatingTeamIds, query]);
  const toggleClub = (club: Club, checked: boolean) => setSelected((current) => { const next = { ...current }; if (!checked) delete next[club.id]; else { const teams = teamsFor(club.id); next[club.id] = teams.length === 1 ? teams[0].id : ""; } return next; });
  const selectedPhase = data.phases.find((phase) => phase.id === phaseId), groupRequired = selectedPhase?.modeId === "MPH001", groupForbidden = !!selectedPhase && !groupRequired;
  const phaseGroups = data.groups.filter((group) => group.phaseId === phaseId);
  const reset = () => { setSelected({}); setEventId(""); setPhaseId(""); setGroupId(""); setDate(new Date().toISOString().slice(0, 10)); setStatus("INSCRIT"); setObservations(""); setErrors({}); setQuery(""); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return; setSaving(true); setErrors({});
    const missing = Object.entries(selected).find(([, teamId]) => !teamId);
    if (missing) { setErrors({ [`team_${missing[0]}`]: "Choisissez l’équipe engagée." }); setSaving(false); return; }
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clubTeams: Object.entries(selected).map(([clubId, teamId]) => ({ clubId, teamId })), epreuveId: eventId, phaseId, groupId: groupForbidden ? "" : groupId, dateInscription: date, statutParticipation: status, observations }) });
      const payload = await response.json();
      if (!response.ok) { setErrors({ ...(payload?.error?.fields || {}), _form: payload?.error?.message || "Enregistrement impossible." }); return; }
      setData(payload); setOpen(false); reset();
    } catch { setErrors({ _form: "Service temporairement indisponible." }); }
    finally { setSaving(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Unités engagées</h2><p className="text-sm text-muted-foreground">Chaque équipe réelle est engagée dans une épreuve compatible puis affectée à sa phase initiale.</p></div>{federal ? <Button onClick={() => { reset(); setOpen(true); }} disabled={loading || data.events.length === 0 || data.phases.length === 0}><Plus />Ajouter des équipes</Button> : null}</div>
    {!loading && data.events.length === 0 ? <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Créez d’abord une épreuve avant d’engager des équipes.</div> : null}
    {loadError ? <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{loadError}<Button variant="outline" className="ml-3" onClick={() => void load()}>Réessayer</Button></div> : loading ? <p className="text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />Chargement des participants…</p> : data.participants.length === 0 ? <p className="rounded-lg border p-6 text-center text-muted-foreground">Aucun club participant.</p> : <>
      <div className="grid gap-3 md:hidden">{data.participants.map((item) => <article key={item.id} className="rounded-lg border p-4"><div className="font-medium">{item.club}</div><div className="text-sm text-muted-foreground">{item.equipe} · {item.categorie} · {item.sexe}</div><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt className="text-muted-foreground">Groupe</dt><dd>{item.groupe}</dd><dt className="text-muted-foreground">Inscription</dt><dd>{formatDisplayDate(item.dateInscription)}</dd><dt className="text-muted-foreground">Statut</dt><dd><StatusBadge status={item.statut} /></dd></dl></article>)}</div>
      <div className="hidden min-w-0 grid-cols-7 md:grid">{["Club", "Équipe engagée", "Catégorie d’âge", "Sexe", "Groupe", "Date d’inscription", "Statut"].map((label) => <div key={label} className="min-w-0 break-words border-b p-3 text-xs font-semibold uppercase text-muted-foreground">{label}</div>)}{data.participants.map((item) => <div key={item.id} className="contents">{[item.club, item.equipe, item.categorie, item.sexe, item.groupe, formatDisplayDate(item.dateInscription)].map((value, index) => <div key={index} className="min-w-0 break-words border-b p-3 text-sm">{value}</div>)}<div className="min-w-0 border-b p-3"><StatusBadge status={item.statut} /></div></div>)}</div>
    </>}
    <Sheet open={open} onOpenChange={(value) => { if (!saving) setOpen(value); }}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader><SheetTitle>Ajouter des équipes engagées</SheetTitle><SheetDescription>Sélectionnez chaque club, l’équipe à engager et son groupe dans cette compétition.</SheetDescription></SheetHeader><form onSubmit={submit} className="space-y-5 px-4 pb-6">
      <div className="space-y-2"><Label>Épreuve</Label><Select value={eventId} onValueChange={(value) => { setEventId(value); setPhaseId(""); setGroupId(""); setSelected({}); }} disabled={saving}><SelectTrigger aria-invalid={!!errors.epreuveId}><SelectValue placeholder="Sélectionner l’épreuve"/></SelectTrigger><SelectContent>{data.events.map((event) => <SelectItem key={event.id} value={event.id}>{event.label}</SelectItem>)}</SelectContent></Select>{errors.epreuveId ? <p className="text-sm text-destructive">{errors.epreuveId}</p> : null}</div>
      <div className="space-y-2"><Label htmlFor="club-search">Rechercher un club</Label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input id="club-search" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Nom du club" disabled={saving || !eventId}/></div></div>
      <div className="space-y-3">{filtered.map((club) => { const teams = teamsFor(club.id), checked = Object.prototype.hasOwnProperty.call(selected, club.id); return <div key={club.id} className="rounded-lg border p-3"><div className="flex items-center gap-3"><Checkbox id={`club-${club.id}`} checked={checked} disabled={saving} onCheckedChange={(value) => toggleClub(club, value === true)}/><Label htmlFor={`club-${club.id}`} className="font-medium">{club.nom}</Label><span className="ml-auto text-xs text-muted-foreground">{teams.length} équipe{teams.length > 1 ? "s" : ""} disponible{teams.length > 1 ? "s" : ""}</span></div>{checked ? <div className="mt-3 space-y-2 pl-7"><Label>Équipe engagée</Label><SearchSelect value={selected[club.id]} onValueChange={(value) => setSelected((current) => ({ ...current, [club.id]: value }))} options={teams.map((team) => ({ id: team.id, label: `${team.nom} — ${team.categorie} — ${team.sexe}` }))} placeholder="Rechercher l’équipe" disabled={saving}/>{errors[`team_${club.id}`] ? <p className="mt-1 text-sm text-destructive">{errors[`team_${club.id}`]}</p> : null}</div> : null}</div>; })}{filtered.length === 0 ? <p className="rounded-lg border p-5 text-center text-sm text-muted-foreground">Aucun club ne possède encore une équipe disponible pour cette compétition.</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Phase</Label><Select value={phaseId} onValueChange={(value) => { setPhaseId(value); setGroupId(""); }} disabled={saving}><SelectTrigger aria-invalid={!!errors.phaseId}><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{data.phases.filter((phase) => phase.statut !== "INACTIF").map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.label}</SelectItem>)}</SelectContent></Select>{errors.phaseId ? <p className="text-sm text-destructive">{errors.phaseId}</p> : null}</div>{!groupForbidden && phaseId ? <div className="space-y-2"><Label>Groupe{groupRequired ? "" : " (facultatif)"}</Label><Select value={groupId} onValueChange={setGroupId} disabled={saving}><SelectTrigger aria-invalid={!!errors.groupId}><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{phaseGroups.map((group) => <SelectItem key={group.id} value={group.id}>{group.label}</SelectItem>)}</SelectContent></Select>{errors.groupId ? <p className="text-sm text-destructive">{errors.groupId}</p> : null}</div> : null}<div className="space-y-2"><Label htmlFor="registration-date">Date d’inscription</Label><Input id="registration-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={saving} aria-invalid={!!errors.dateInscription}/>{errors.dateInscription ? <p className="text-sm text-destructive">{errors.dateInscription}</p> : null}</div><div className="space-y-2"><Label>Statut</Label><Select value={status} onValueChange={setStatus} disabled={saving}><SelectTrigger aria-invalid={!!errors.statutParticipation}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INSCRIT">Inscrit</SelectItem><SelectItem value="EN_ATTENTE">En attente</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="participant-observations">Observation</Label><Input id="participant-observations" value={observations} onChange={(event) => setObservations(event.target.value)} disabled={saving}/></div></div>
      {errors.clubTeams ? <p className="text-sm text-destructive">{errors.clubTeams}</p> : null}{errors._form ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errors._form}</p> : null}<SheetFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button><Button type="submit" disabled={saving || !Object.keys(selected).length || !phaseId || (groupRequired && !groupId)}>{saving ? <><Loader2 className="animate-spin"/>Enregistrement des trois écritures…</> : "Ajouter les équipes"}</Button></SheetFooter>
    </form></SheetContent></Sheet>
  </section>;
}
