"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { getFilterOptions } from "@/lib/models"
import type { AthleteTableRow } from "@/lib/athlete-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { compareLicenceNumbers, type SeasonOption } from "@/lib/current-season-domain"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "AT"
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null
  const d = new Date(dateNaissance)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 ? age : null
}

const columns: Column<AthleteTableRow>[] = [
  {
    key: "licenceDisplay",
    header: "Licence",
    className: "w-[10%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-words leading-snug" title={item.licenceState === "AMBIGUOUS" ? "Plusieurs licences pour cette saison : vérification administrative nécessaire." : item.licenceState === "INACTIVE" ? "Aucune licence active pour la saison courante." : undefined}>{item.licenceDisplay || ""}</span>,
  },
  {
    key: "avatarUrl",
    header: "Avatar",
    className: "w-[6%] text-center",
    render: (item) => (
      <div className="flex justify-center">
        <Avatar className="size-10">
          <AvatarImage src={(item.avatarUrl as string | undefined) || undefined} alt={`${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-xs">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    key: "nomComplet",
    header: "Nom complet",
    className: "w-[36%] whitespace-normal font-medium",
    render: (item) => (
      <span className="block whitespace-normal break-words leading-snug">
        {item.nomComplet || `${item.prenom} ${item.nom}`}
      </span>
    ),
  },
  {
    key: "sexe",
    header: "Sexe / age",
    className: "w-[8%] text-center",
    render: (item) => {
      const age = calcAge(item.dateNaissance)
      const sexe = item.sexe === "F" ? "F" : "M"
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-sm font-semibold">{sexe}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{age !== null ? `${age} ans` : "-"}</span>
        </div>
      )
    },
  },
  {
    key: "idNational",
    header: "ID national",
    className: "w-[14%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.idNational || "-"}</span>,
  },
  {
    key: "idFiba",
    header: "ID FIBA",
    className: "w-[14%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.idFiba || "-"}</span>,
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[8%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<AthleteTableRow[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [season, setSeason] = useState<SeasonOption | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState("")
  const [sort, setSort] = useState("name")
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()
    ;(async () => {
      try {
        setLoading(true); setError("")
        const res = await fetch("/api/athletes?view=table", { cache: "no-store", signal: controller.signal })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Lecture impossible.")

        if (!canceled) {
          const normalize = (value: unknown) => String(value ?? "").trim()
          const normalizeSexe = (value: unknown) => {
            const v = normalize(value).toLowerCase()
            if (v === "f" || v.startsWith("f")) return "F"
            return "M"
          }

          const raw = Array.isArray(json?.athletes) ? (json.athletes as AthleteTableRow[]) : []
          const cleaned = raw.map((a) => {
            const next = { ...a }
            next.sexe = normalizeSexe(a.sexe)
            next.statut = normalize(a.statut)
            return next
          })

          setAthletes(cleaned)
          setSeason(json.currentSeason || null)
        }
      } catch (cause) {
        if (!canceled) { setAthletes([]); setError(cause instanceof Error ? cause.message : "Lecture impossible.") }
      } finally { if (!canceled) setLoading(false) }
    })()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [revision])

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    const visible = () => { if (document.visibilityState === "visible") refresh() }
    window.addEventListener("focus", refresh)
    window.addEventListener("febaco:season-changed", refresh)
    document.addEventListener("visibilitychange", visible)
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("febaco-season") : null
    if (channel) channel.onmessage = refresh
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("febaco:season-changed", refresh); document.removeEventListener("visibilitychange", visible); channel?.close() }
  }, [])

  const sortedAthletes = useMemo(() => [...athletes].sort((a, b) => sort === "name"
    ? String(a.nomComplet ?? "").localeCompare(String(b.nomComplet ?? ""), "fr", { sensitivity: "base" })
    : compareLicenceNumbers(a, b, sort === "licence-desc" ? "desc" : "asc")), [athletes, sort])

  const filters: Filter[] = useMemo(() => {
    return [
      {
        key: "sexe",
        label: "Sexe",
        options: [
          { value: "M", label: "M" },
          { value: "F", label: "F" },
        ],
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(athletes, "statut"),
      },
    ]
  }, [athletes])

  return (
    <div className="flex flex-col">
      <Header title="Athlètes" subtitle={season ? `Licence de la saison courante : ${season.label}` : "Liste des athlètes FEBACO"} />

      <div className="flex-1 p-6">
        {!loading && !error && !season ? <div role="status" className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">Aucune saison courante n’est définie. Demandez à un administrateur autorisé de la configurer dans Paramètres. Les cellules Licence restent vides.</div> : null}
        {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
        {loading ? <p role="status" className="mb-4 text-sm text-muted-foreground">Chargement des athlètes et des licences…</p> : null}
        <div className="mb-4 flex justify-end">
          <ActorEditor kind="athletes" onSaved={() => setRevision(value => value + 1)} />
        </div>
        <DataTable
          data={sortedAthletes}
          showFilterLabels
          toolbarControls={<div className="space-y-1.5"><label htmlFor="athlete-sort" className="text-sm font-medium">Trier par</label><Select value={sort} onValueChange={setSort}><SelectTrigger id="athlete-sort" aria-label="Trier les athlètes" className="w-[240px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Nom complet</SelectItem><SelectItem value="licence-asc">Licence : ordre croissant</SelectItem><SelectItem value="licence-desc">Licence : ordre décroissant</SelectItem></SelectContent></Select></div>}
          columns={columns}
          filters={filters}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          tableClassName="table-fixed"
          searchPlaceholder="Rechercher par licence, nom…"
          searchableKeys={["licenceDisplay", "nomComplet", "sexe", "dateNaissance", "idNational", "idFiba", "statut"]}
          detailHref={(item) => `/dashboard/athletes/${encodeURIComponent(item.id || item.__key || "")}`}
          idKey="__key"
          renderMobileCard={item => <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <Avatar className="size-10"><AvatarImage src={item.avatarUrl || undefined} alt="" /><AvatarFallback>{initials(item.prenom, item.nom)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><p className="break-words font-semibold">{item.nomComplet || `${item.prenom} ${item.nom}`}</p><p className="mt-1 break-words text-sm"><span className="text-muted-foreground">Licence : </span>{item.licenceDisplay || ""}</p></div>
              <StatusBadge status={item.statut} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">Sexe / âge</p><p>{item.sexe} · {calcAge(item.dateNaissance) ?? "—"} ans</p></div><div><p className="text-muted-foreground">ID national</p><p className="break-all">{item.idNational || "Non renseigné"}</p></div><div><p className="text-muted-foreground">ID FIBA</p><p className="break-all">{item.idFiba || "Non renseigné"}</p></div></div>
            <a className="mt-4 block rounded-md border px-3 py-2 text-center text-sm font-medium hover:bg-accent" href={`/dashboard/athletes/${encodeURIComponent(item.id)}`}>Voir la fiche</a>
          </div>}
        />
      </div>
    </div>
  )
}
