"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { Athlete, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"

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

const columns: Column<Athlete>[] = [
  {
    key: "id",
    header: "ID athlete",
    className: "w-[22%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.id || "-"}</span>,
  },
  {
    key: "avatarUrl",
    header: "Avatar",
    className: "w-[76px] text-center",
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
    className: "w-[24%] whitespace-normal font-medium",
    render: (item) => (
      <span className="block whitespace-normal break-words leading-snug">
        {item.nomComplet || `${item.prenom} ${item.nom}`}
      </span>
    ),
  },
  {
    key: "sexe",
    header: "Sexe / age",
    className: "w-[90px] text-center",
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
    className: "w-[19%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.idNational || "-"}</span>,
  },
  {
    key: "idFiba",
    header: "ID FIBA",
    className: "w-[19%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.idFiba || "-"}</span>,
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[10%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/athletes", { cache: "no-store" })
        const json = await res.json()

        if (!canceled) {
          const normalize = (value: unknown) => String(value ?? "").trim()
          const normalizeSexe = (value: unknown) => {
            const v = normalize(value).toLowerCase()
            if (v === "f" || v.startsWith("f")) return "F"
            return "M"
          }

          const raw = Array.isArray(json?.athletes) ? (json.athletes as Athlete[]) : []
          const cleaned = raw.map((a) => {
            const next = { ...a } as Athlete
            next.sexe = normalizeSexe(a.sexe)
            next.statut = normalize((a as unknown as { statut?: unknown }).statut)
            return next
          })

          setAthletes(cleaned)
        }
      } catch {
        if (!canceled) setAthletes([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

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
      <Header title="Athletes" subtitle="Liste des athletes affilies a la FEBACO" />

      <div className="flex-1 p-6">
        <div className="mb-4 flex justify-end"><ActorEditor kind="athletes" onSaved={(actor) => setAthletes(current => [actor as unknown as Athlete, ...current].sort((a,b)=>String(a.nomComplet??"").localeCompare(String(b.nomComplet??""),"fr",{sensitivity:"base"})))} /></div>
        <DataTable
          data={athletes}
          columns={columns}
          filters={filters}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          tableClassName="table-fixed"
          searchPlaceholder="Rechercher un athlete..."
          detailHref={(item) => `/dashboard/athletes/${encodeURIComponent(item.id || item.__key || "")}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
