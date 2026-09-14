"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { Arbitre, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "AR"
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

const columns: Column<Arbitre>[] = [
  {
    key: "id",
    header: "ID",
    className: "w-[11%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block whitespace-normal break-all leading-snug">{item.id || "-"}</span>,
  },
  {
    key: "nomComplet",
    header: "Nom complet",
    className: "w-[26%] whitespace-normal font-medium",
    render: (item) => {
      const age = calcAge(item.dateNaissance)
      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={item.avatarUrl || undefined} alt={item.nomComplet || `${item.prenom} ${item.nom}`} />
            <AvatarFallback className="text-xs">{initials(item.prenom, item.nom)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="block whitespace-normal break-words leading-snug">
              {item.nomComplet || `${item.prenom} ${item.nom}`}
            </span>
            <span className="block text-xs text-muted-foreground">
              {age !== null ? `${age} ans` : "-"} / {item.sexe || "-"}
            </span>
          </div>
        </div>
      )
    },
  },
  {
    key: "grade",
    header: "Grade",
    className: "w-[11%] whitespace-normal break-words",
    render: (item) => item.grade || "-",
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
    className: "w-[10%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function ArbitresPage() {
  const [arbitres, setArbitres] = useState<Arbitre[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/arbitres", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          const normalize = (value: unknown) => String(value ?? "").trim()
          const normalizeSexe = (value: unknown) => {
            const v = normalize(value).toLowerCase()
            if (v === "f" || v.startsWith("f")) return "F"
            return "M"
          }

          const raw = Array.isArray(json?.arbitres) ? (json.arbitres as Arbitre[]) : []
          setArbitres(
            raw.map((arbitre) => ({
              ...arbitre,
              sexe: normalizeSexe(arbitre.sexe),
              statut: normalize(arbitre.statut),
            }))
          )
        }
      } catch {
        if (!canceled) setArbitres([])
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
        key: "grade",
        label: "Grade",
        options: getFilterOptions(arbitres, "grade"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(arbitres, "statut"),
      },
    ]
  }, [arbitres])

  return (
    <div className="flex flex-col">
      <Header title="Arbitres" subtitle="Liste des arbitres affilies a la FEBACO" />

      <div className="flex-1 p-6">
        <div className="mb-4 flex justify-end"><ActorEditor kind="arbitres" onSaved={(actor) => setArbitres(current => [actor as unknown as Arbitre, ...current].sort((a,b)=>String(a.nomComplet??"").localeCompare(String(b.nomComplet??""),"fr",{sensitivity:"base"})))} /></div>
        <DataTable
          data={arbitres}
          columns={columns}
          filters={filters}
          tableClassName="table-fixed"
          actionsClassName="w-[14%]"
          searchPlaceholder="Rechercher un arbitre..."
          detailHref={(item) => `/dashboard/arbitres/${encodeURIComponent(item.id || item.__key || "")}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
