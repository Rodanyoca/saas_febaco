"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { Coach, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { compareLicenceNumbers } from "@/lib/current-season-domain"

const nameCollator = new Intl.Collator("fr", { sensitivity: "base" })

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "EN"
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

const columns: Column<Coach>[] = [
  {
    key: "licenceDisplay",
    header: "Licence",
    className: "w-[10%] font-mono text-sm",
    render: (item) => <span className="block truncate" title={item.licenceAmbiguous ? "Plusieurs licences valides : vérification administrative nécessaire." : item.licenceDisplay}>{item.licenceAmbiguous ? "À vérifier" : item.licenceDisplay || ""}</span>,
  },
  {
    key: "avatarUrl",
    header: "Avatar",
    className: "w-[5%] text-center",
    render: (item) => (
      <div className="flex justify-center">
        <Avatar className="size-10">
          <AvatarImage src={(item as unknown as { avatarUrl?: string }).avatarUrl || undefined} alt={`${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-xs">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    key: "nomComplet",
    header: "Nom complet",
    className: "w-[28%] font-medium",
    render: (item) => (
      <span className="block truncate" title={item.nomComplet || `${item.prenom} ${item.nom}`}>
        {item.nomComplet || `${item.prenom} ${item.nom}`}
      </span>
    ),
  },
  {
    key: "niveau",
    header: "Niveau",
    className: "w-[7%] whitespace-normal",
    render: (item) => <span className="block whitespace-normal break-words leading-snug">{item.niveau || "-"}</span>,
  },
  {
    key: "sexe",
    header: "Sexe / âge",
    className: "w-[7%] text-center",
    render: (item) => {
      const age = calcAge(item.dateNaissance)
      const sexe = item.sexe === "F" ? "F" : "M"
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-sm font-semibold">{sexe}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{age !== null ? `${age} ans` : "-"}</span>
        </div>
      )
    },
  },
  {
    key: "nationalite",
    header: "Nationalité",
    className: "w-[8%]",
    render: (item) => <span className="block truncate" title={item.nationalite}>{item.nationalite || "-"}</span>,
  },
  {
    key: "idNational",
    header: "ID national",
    className: "w-[10%] font-mono text-sm",
    render: (item) => <span className="block truncate" title={item.idNational}>{item.idNational || "-"}</span>,
  },
  {
    key: "idFiba",
    header: "ID FIBA",
    className: "w-[10%] font-mono text-sm",
    render: (item) => <span className="block truncate" title={item.idFiba}>{item.idFiba || "-"}</span>,
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[9%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function CoachsPage() {
  const [coachs, setCoachs] = useState<Coach[]>([])
  const [sort, setSort] = useState("name")
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()
    ;(async () => {
      try {
        setLoading(true); setError("")
        const res = await fetch("/api/coachs", { cache: "no-store", signal: controller.signal })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Lecture impossible.")

        if (!canceled) {
          const normalize = (value: unknown) => String(value ?? "").trim()
          const normalizeSexe = (value: unknown) => {
            const v = normalize(value).toLowerCase()
            if (v === "f" || v.startsWith("f")) return "F"
            return "M"
          }

          const raw = Array.isArray(json?.coachs) ? (json.coachs as Coach[]) : []
          setCoachs(
            raw.map((coach) => ({
              ...coach,
              sexe: normalizeSexe(coach.sexe),
              statut: normalize(coach.statut),
            }))
          )
        }
      } catch (cause) {
        if (!canceled) { setCoachs([]); setError(cause instanceof Error ? cause.message : "Lecture impossible.") }
      } finally { if (!canceled) setLoading(false) }
    })()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [revision])

  const sortedCoachs = useMemo(() => [...coachs].sort((a, b) => sort === "name"
    ? nameCollator.compare(a.nomComplet || "", b.nomComplet || "")
    : compareLicenceNumbers(a, b, sort === "licence-desc" ? "desc" : "asc")), [coachs, sort])

  const filters: Filter[] = useMemo(
    () => [
      {
        key: "sexe",
        label: "Sexe",
        options: [
          { value: "M", label: "Masculin" },
          { value: "F", label: "Féminin" },
        ],
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(coachs, "statut"),
      },
        {
          key: "niveau",
          label: "Niveau",
          options: getFilterOptions(coachs, "niveau"),
        },
    ],
    [coachs]
  )

  return (
    <div className="flex flex-col">
      <Header title="Entraîneurs" subtitle="Liste des coachs et de leurs licences actuellement valides" />

      <div className="flex-1 p-6">
        {loading ? <p role="status" className="mb-4 text-sm text-muted-foreground">Chargement des coachs et des licences…</p> : null}
        {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
        <div className="mb-4 flex justify-end"><ActorEditor kind="coachs" onSaved={() => setRevision(value => value + 1)} /></div>
        <DataTable
          data={sortedCoachs}
          showFilterLabels
          toolbarControls={<div className="space-y-1.5"><label htmlFor="coach-sort" className="text-sm font-medium">Trier par</label><Select value={sort} onValueChange={setSort}><SelectTrigger id="coach-sort" className="w-[240px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Nom complet</SelectItem><SelectItem value="licence-asc">Licence : ordre croissant</SelectItem><SelectItem value="licence-desc">Licence : ordre décroissant</SelectItem></SelectContent></Select></div>}
          columns={columns}
          filters={filters}
          tableClassName="table-fixed"
          actionsClassName="w-[6%]"
          searchPlaceholder="Rechercher par licence, nom…"
          searchableKeys={["licenceDisplay", "nomComplet", "sexe", "niveau", "nationalite", "idNational", "idFiba", "statut"]}
          detailHref={(item) => `/dashboard/coachs/${encodeURIComponent(item.id || item.__key || "")}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
