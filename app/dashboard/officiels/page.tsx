"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { Officiel, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "OF"
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null
  const date = new Date(dateNaissance)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const month = today.getMonth() - date.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age -= 1
  return age >= 0 ? age : null
}

const columns: Column<Officiel>[] = [
  {
    key: "id",
    header: "ID",
    className: "w-[11%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block break-all">{item.id || "-"}</span>,
  },
  {
    key: "nomComplet",
    header: "Nom complet",
    className: "w-[24%] whitespace-normal font-medium",
    render: (item) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={item.avatarUrl || undefined} alt={item.nomComplet || `${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-xs">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
        <span className="block min-w-0 whitespace-normal break-words leading-snug">
          {item.nomComplet || `${item.prenom} ${item.nom}`}
        </span>
      </div>
    ),
  },
  {
    key: "sexe",
    header: "Sexe / Âge",
    className: "w-[14%]",
    render: (item) => {
      const age = calcAge(item.dateNaissance)
      return (
        <div className="space-y-1">
          <span className="block">{item.sexe || "-"}</span>
          <span className="block text-xs text-muted-foreground">{age !== null ? `${age} ans` : "-"}</span>
        </div>
      )
    },
  },
  {
    key: "idNational",
    header: "Identifiants",
    className: "w-[17%]",
    render: (item) => (
      <div className="space-y-1 font-mono text-xs">
        <span className="block break-all">National : {item.idNational || "-"}</span>
        <span className="block break-all">FIBA : {item.idFiba || "-"}</span>
      </div>
    ),
  },
  {
    key: "email",
    header: "Contact",
    className: "w-[20%]",
    render: (item) => (
      <div className="space-y-1 text-sm">
        <span className="block break-all">{item.email || "-"}</span>
        <span className="block text-xs text-muted-foreground">{item.telephone || "-"}</span>
      </div>
    ),
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[10%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function OfficielsPage() {
  const [officiels, setOfficiels] = useState<Officiel[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/officiels", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          const raw = Array.isArray(json?.officiels) ? (json.officiels as Officiel[]) : []
          setOfficiels(
            raw.map((officiel) => ({
              ...officiel,
              sexe: String(officiel.sexe ?? "").trim().toUpperCase(),
              statut: String(officiel.statut ?? "").trim(),
            }))
          )
        }
      } catch {
        if (!canceled) setOfficiels([])
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
        options: getFilterOptions(officiels, "statut"),
      },
    ]
  }, [officiels])

  return (
    <div className="flex flex-col">
      <Header
        title="Officiels"
        subtitle="Liste des officiels et dirigeants de la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <div className="mb-4 flex justify-end"><ActorEditor kind="officiels" onSaved={(actor) => setOfficiels(current => [actor as unknown as Officiel, ...current].sort((a,b)=>String(a.nomComplet??"").localeCompare(String(b.nomComplet??""),"fr",{sensitivity:"base"})))} /></div>
        <DataTable
          data={officiels}
          columns={columns}
          filters={filters}
          tableClassName="table-fixed"
          actionsClassName="w-[10%]"
          searchPlaceholder="Rechercher un officiel..."
          detailHref={(item) => `/dashboard/officiels/${encodeURIComponent(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
