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
    key: "licenceDisplay",
    header: "Licence",
    className: "w-[12%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block break-all leading-snug" title={item.licenceAmbiguous ? "Plusieurs licences valides : vérification administrative nécessaire." : undefined}>{item.licenceAmbiguous ? "À vérifier" : item.licenceDisplay || ""}</span>,
  },
  {
    key: "avatarUrl",
    header: "Avatar",
    className: "w-[6%] text-center",
    render: (item) => (
      <div className="flex justify-center">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={item.avatarUrl || undefined} alt={item.nomComplet || `${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-xs">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    key: "nomComplet",
    header: "Nom complet",
    className: "w-[28%] whitespace-normal font-medium",
    render: (item) => (
        <span className="block whitespace-normal break-words leading-snug">
          {item.nomComplet || `${item.prenom} ${item.nom}`}
        </span>
    ),
  },
  {
    key: "sexe",
    header: "Sexe / âge",
    className: "w-[8%] text-center",
    render: (item) => {
      const age = calcAge(item.dateNaissance)
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-sm font-semibold">{item.sexe || "-"}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{age !== null ? `${age} ans` : "-"}</span>
        </div>
      )
    },
  },
  {
    key: "idNational",
    header: "ID national",
    className: "w-[14%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block break-all leading-snug">{item.idNational || "-"}</span>,
  },
  {
    key: "idFiba",
    header: "ID FIBA",
    className: "w-[14%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block break-all leading-snug">{item.idFiba || "-"}</span>,
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[12%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function OfficielsPage() {
  const [officiels, setOfficiels] = useState<Officiel[]>([])
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()
    ;(async () => {
      try {
        setLoading(true); setError("")
        const res = await fetch("/api/officiels", { cache: "no-store", signal: controller.signal })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Lecture impossible.")
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
      } catch (cause) {
        if (!canceled) { setOfficiels([]); setError(cause instanceof Error ? cause.message : "Lecture impossible.") }
      } finally { if (!canceled) setLoading(false) }
    })()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [revision])

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
        subtitle="Liste des officiels et de leurs licences actuellement valides"
      />

      <div className="flex-1 p-6">
        {loading ? <p role="status" className="mb-4 text-sm text-muted-foreground">Chargement des officiels et des licences…</p> : null}
        {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
        <div className="mb-4 flex justify-end"><ActorEditor kind="officiels" onSaved={() => setRevision(value => value + 1)} /></div>
        <DataTable
          data={officiels}
          columns={columns}
          filters={filters}
          tableClassName="table-fixed"
          actionsClassName="w-[6%]"
          searchPlaceholder="Rechercher par licence, nom…"
          searchableKeys={["licenceDisplay", "nomComplet", "sexe", "idNational", "idFiba", "statut"]}
          detailHref={(item) => `/dashboard/officiels/${encodeURIComponent(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
