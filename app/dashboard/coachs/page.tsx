"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { Coach, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/dashboard/status-badge"

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
    key: "id",
    header: "ID",
    className: "w-[10%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.id || "-"}</span>,
  },
  {
    key: "avatarUrl",
    header: "Avatar",
    className: "w-[7%] text-center",
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
    className: "w-[21%] whitespace-normal font-medium",
    render: (item) => (
      <span className="block whitespace-normal break-words leading-snug">
        {item.nomComplet || `${item.prenom} ${item.nom}`}
      </span>
    ),
  },
  {
    key: "niveau",
    header: "Niveau",
    className: "w-[8%] whitespace-normal break-words",
    render: (item) => item.niveau || "-",
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
    key: "nationalite",
    header: "Nationalite",
    className: "w-[10%] whitespace-normal break-words",
    render: (item) => <span className="block whitespace-normal break-words leading-snug">{item.nationalite || "-"}</span>,
  },
  {
    key: "idNational",
    header: "ID national",
    className: "w-[12%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.idNational || "-"}</span>,
  },
  {
    key: "idFiba",
    header: "ID FIBA",
    className: "w-[12%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.idFiba || "-"}</span>,
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[10%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function CoachsPage() {
  const [coachs, setCoachs] = useState<Coach[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/coachs", { cache: "no-store" })
        const json = await res.json()

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
      } catch {
        if (!canceled) setCoachs([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const filters: Filter[] = useMemo(
    () => [
      {
        key: "sexe",
        label: "Sexe",
        options: [
          { value: "M", label: "M" },
          { value: "F", label: "F" },
        ],
      },
      {
        key: "nationalite",
        label: "Nationalite",
        options: getFilterOptions(coachs, "nationalite"),
      },
        {
          key: "niveau",
          label: "Niveau",
          options: getFilterOptions(coachs, "niveau"),
        },
        {
          key: "statut",
          label: "Statut",
          options: getFilterOptions(coachs, "statut"),
        },
    ],
    [coachs]
  )

  return (
    <div className="flex flex-col">
      <Header title="Entraineurs" subtitle="Liste des entraineurs affilies a la FEBACO" />

      <div className="flex-1 p-6">
        <DataTable
          data={coachs}
          columns={columns}
          filters={filters}
          tableClassName="table-fixed"
          actionsClassName="w-[12%]"
          searchPlaceholder="Rechercher un entraineur..."
          detailHref={(item) => `/dashboard/coachs/${encodeURIComponent(item.id || item.__key || "")}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
